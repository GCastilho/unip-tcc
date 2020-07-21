import OrderDoc from '../db/models/order'
import { Decimal128 } from 'mongodb'
import type { Order } from '../db/models/order'

/**
 * Retorna uma instancia da OrderTypeUtils, que contém métodos para manipulação
 * e checagem de ordens que serão diferentes de acordo com o tipo da taker
 * informado
 */
const orderTypeUtils = (function OrderUtils() {
	/**
	 * Contém métodos para manipulação e checagem de ordens que serão diferentes
	 * de acordo com o tipo da taker informado
	 */
	class OrderTypeUtils {
		/** Retorna quais são as propriedades contante e variável da ordem */
		public getProps: () => { propConstQty: 'total'|'amount'; propVarQty: 'total'|'amount' }
		/** Checa se o preço da maker está maior/menor que o preço da taker */
		public invalidPrice: (takerPrice: number, makerPrice: number) => boolean
		/** Atualiza o remaining corretamente */
		public updateRemaining: (remaining: number, price: number, currentPrice: number) => number
		/** Ao ser passado o valor constante e o preço, retorna o valor variável */
		public getVarQty: (constQty: number, price: number) => number

		constructor(type: Order['type']) {
			if (type == 'buy') {
				this.getProps = () => ({ propConstQty: 'total', propVarQty: 'amount' })
				this.invalidPrice = (takerPrice: number, makerPrice: number) => makerPrice > takerPrice
				this.updateRemaining = (remaining: number, price: number, currentPrice: number) => {
					return remaining * (price / currentPrice)
				}
				this.getVarQty = (constQty: number, price: number) => constQty / price
			} else {
				this.getProps = () => ({ propConstQty: 'amount', propVarQty: 'total' })
				this.invalidPrice = (takerPrice: number, makerPrice: number) => makerPrice < takerPrice
				this.updateRemaining = (remaining: number, price: number, currentPrice: number) => {
					return remaining / (price / currentPrice)
				}
				this.getVarQty = (constQty: number, price: number) => constQty * price
			}
		}
	}

	// Mantém instancias da OrderTypeUtils na memória para reduzir garbage
	const buyInstance = new OrderTypeUtils('buy')
	const sellInstance = new OrderTypeUtils('sell')

	/** Retorna uma instance da OrderTypeUtils para o type informado */
	return function getInstance(type: Order['type']) {
		return type == 'buy' ? buyInstance : sellInstance
	}
})()

/**
 * Combina uma ordem taker com ordens ordens makers, dividindo a ordem taker em
 * ordens iguais as makers, retornando-as em pares
 *
 * A ordem taker deve ter um preço igual ou "mais vantajoso" que as ordens do
 * array de makers, isto é, serem mais baratas para uma taker de compra ou mais
 * caras para uma taker de venda
 *
 * Se a quantidade (amount/total) das ordens forem diferentes, elas serão
 * retornadas em um array de 'leftovers'. Este array pode conter ordens maker
 * que ultrapassaram a quantidade a ser consumida da taker (no caso de 2 makers
 * de 6 a segunda irá ultrapassar uma taker de 10) ou o restante da taker, caso
 * o array de makers não tenha ordens suficientes para consumir a taker
 * completamente
 *
 * As ordens serão salvas no db, a taker será deletada (ou modificada), as
 * ordens que foram feitos matchs retornarão em um array de touples
 * [maker, taker] e o "resto" irá retornar em um array de leftovers
 */
async function matchMakers(taker: Order, makers: Order[]) {
	const utils = orderTypeUtils(taker['type'])
	/** propConstQty é quanto o usuário TEM; propVarQty é quanto o usuário QUER */
	const { propConstQty, propVarQty } = utils.getProps()
	/** Quantidade da taker[propConstQty] restante para dar match */
	let remaining = +taker[propConstQty]
	/** Array de touples [maker, taker] */
	const matchs: [Order, Order][] = []
	/** Iterable do array de makers */
	const makersIterable = makers.values()
	/**
	 * Array de 'resto', ordens que não foram feitas match e devem ser
	 * recolocadas no orderbook
	 */
	const leftovers: Order[] = []

	/**
	 * Itera pelo array de makers e cria uma cópia da taker com os valores de cada
	 * ordem. Se o array de makers tiver um amount/total que soma mais que o
	 * equivalente na taker, a última ordem será colocada no array de leftovers
	 * e o remaining não será descontado
	 *
	 * Se a Market selecionou as ordens corretamente haverá apenas uma ordem no
	 * leftovers, alem disso, o preço das makers sempre será "vantajoso" para a
	 * taker, ou seja, retornará uma quantidade maior ou igual ao "esperado" pela
	 * ordem (o valor do propVarQty)
	 */
	for (const maker of makersIterable) {
		/** Se remaining < order - A ordem é maior que o restante da taker */
		if (remaining < +maker[propConstQty]) {
			leftovers.push(maker, ...Array.from(makersIterable))
			break
		}
		remaining -= +maker[propConstQty]
		// Necessário botar a transform function no schema que remove o id e set o new pra true
		const takerCopy = new OrderDoc(taker.toObject())
		takerCopy.total = maker.total
		takerCopy.price = maker.price
		takerCopy.amount = maker.amount
		matchs.push([maker, takerCopy])
	}

	// Corrige o amount e total da taker com o valor de remaining
	taker[propConstQty] = Decimal128.fromNumeric(remaining)
	taker[propVarQty] = Decimal128.fromNumeric(
		utils.getVarQty(+taker[propConstQty], +taker.price)
	)

	/** Array de promessas de operações no banco de dados */
	const promises: Promise<Order>[] = []

	if (remaining > 0) {
		if (leftovers.length > 0) {
			/**
			 * A primeira ordem do resto é maior que o remaining. Ela deve ser
			 * dividida em duas, a primeira com o constProp e varProp da taker e a
			 * segunda com o resto para ser unshifted no array de leftovers. O preço
			 * da taker deve ser atualizado para o da maker (como sempre)
			 */
			const makerOrder = leftovers.shift() as Order

			/** Ordem com os valores da direferença; será reenviada ao leftover */
			// Necessário botar a transform function no schema que remove o id e set o new pra true
			const newMaker = new OrderDoc(makerOrder.toObject())
			newMaker[propConstQty] = Decimal128.fromNumeric(+makerOrder[propConstQty] - +taker[propConstQty])
			newMaker[propVarQty] = Decimal128.fromNumeric(+makerOrder[propVarQty] - +taker[propVarQty])
			leftovers.unshift(newMaker)

			// Faz a maker ter os valores da taker
			makerOrder[propConstQty] = taker[propConstQty]
			makerOrder[propVarQty] = taker[propVarQty]
			taker.price = makerOrder.price // O preço da taker nunca pode mudar
			matchs.push([makerOrder, taker])
		} else {
			/**
			 * Taker é maior que o array de makers. varProp e constProp já estão
			 * atualizadas com o remaining então é só adicioná-la no array de
			 * leftovers para ser retornada
			 */
			leftovers.push(taker)
		}
	} else {
		promises.push(taker.remove())
	}

	// As makers do array de match não foram modificadas, não precisa salvar elas
	promises.push(...matchs.map(orders => orders[1].save()))

	// As ordens do resto podem ou não ter sido modificadas, salva todas
	promises.push(...leftovers.map(order => order.save()))

	await Promise.all(promises)

	return { matchs, leftovers }
}

/**
 * O type da linked list dos nodes do orderbook
 *
 * O orderbook contém nodes de uma linked list colocados em um map para permitir
 * acesso rápido a eles (através do map) e possibilitar acessar o node anterior
 * e o próximo (através da linked list), este último é necessário para saber
 * qual a próxima faixa de preço do orderbook que contém ordens
 */
type LinkedList = {
	price: number
	previous: null|LinkedList
	next: null|LinkedList
	data: Order[]
}

/**
 * Market é uma estrutura que armazena todas as ordens de todos os preços
 * desse par de currencies
 */
class Market {
	/** Um map com as listas de ordens separadas por preço */
	private orderbook: Map<number, LinkedList>
	/** Head da linked list */
	private head: null|LinkedList
	/** Preço da maior ordem de compra */
	public buyPrice: number
	/** Preço da menor ordem de venda */
	public sellPrice: number

	constructor() {
		this.orderbook = new Map()
		this.buyPrice = 0
		this.sellPrice = Infinity
		this.head = null
	}

	/**
	 * Adiciona uma ordem (pré-determinada como) maker ao orderbook
	 * @param order A ordem maker que será adicionada
	 */
	private pushMaker(order: Order) {
		let node = this.orderbook.get(+order.price)
		if (!node) {
			node = {
				price: +order.price,
				previous: null,
				next: null,
				data: []
			}

			if (this.head) {
				// Adiciona o node na posição correta da linked list
				let previous = this.head
				while (previous.next != null && previous.price < node.price) {
					previous = previous.next
				}
				node.next = previous.next
				node.previous = previous
				node.previous.next = node
				if (node.next?.previous != null)
					node.next.previous = node
			} else {
				this.head = node
			}

			this.orderbook.set(+order.price, node)
		}

		node.data.push(order)
		if (order.type == 'buy' && +order.price > this.buyPrice) {
			this.buyPrice = +order.price
		} else if (order.type == 'sell' && +order.price < this.sellPrice) {
			this.sellPrice = +order.price
		}
	}

	/**
	 * Executa uma ordem (pré-determinada como) taker com uma ordem maker
	 * previamente adicionada ao orderbook
	 * @param order A ordem taker que será executada
	 */
	private execTaker(order: Order) {
		/**
		 * Ao fazer trade de uma taker com uma maker de preço mais vantajoso o
		 * montante que será recebido pelo usuário da taker deverá ser corrigido
		 * para o novo preço. Essa variável armazena qual das propriedades da ordem
		 * que contém esse montante
		 *
		 * Em uma ordem tipo 'buy' o total é fixo pois é quanto o usuário irá pagar,
		 * e o amount é variável, pois é o quanto ele irá receber (no caso de sell,
		 * é o oposto)
		 */
		const propVarQty: keyof Order = order['type'] == 'buy' ? 'amount' : 'total'

		/** O preço atual que está baseando o remaining */
		let currentPrice = +order['price']

		/**
		 * O valor corrigido do amount/total restante para o amount/total das ordens
		 * maker ser equivalente ao que a taker está comprando/vendendo
		 */
		let remaining = +order[propVarQty]

		/** Instância da OrderTypeUtils para o type dessa ordem */
		const utils = orderTypeUtils(order.type)

		/** Vetor de ordens maker que irão fazer trade com essa ordem taker */
		const makers: Order[] = []

		while (+remaining >= 0) {
			const price = order.type == 'buy' ? this.buyPrice : this.sellPrice
			// Checa se o preço está no range válido
			if (price == 0 || price == Infinity) break
			const node = this.orderbook.get(price)
			if (!node) throw new Error(`Node for market price of '${price}' not found!`)

			// Checa se o preço da próxima ordem está no limite válido para este type
			if (utils.invalidPrice(+order['price'], node.price)) break

			const makerOrder = node.data.shift()
			// Removes node from linked list if data is empty
			if (node.data.length == 0) {
				// Atualiza os preços
				if (order.type == 'buy') {
					// Atualiza o preço da maior ordem de compra para baixo
					if (node.previous) this.buyPrice = node.previous.price
					else this.buyPrice = 0
				} else {
					// Atualiza o preço da menor ordem de venda para cima
					if (node.next) this.sellPrice = node.next.price
					else this.sellPrice = Infinity
				}
				// Remove o node e atualiza head
				if (node.next)
					node.next.previous = node.previous
				if (node.previous) {
					node.previous.next = node.next
				} else {
					this.head = node.next
				}
				this.orderbook.delete(price)
			}
			if (!makerOrder) continue // Caso tenha um data vazio (por algum motivo)

			remaining = utils.updateRemaining(remaining, +order['price'], currentPrice)
			currentPrice = +makerOrder.price
			// Subtrai do remaining corrigido o amount/total da ordem
			remaining -= +makerOrder[propVarQty]

			// Adiciona a ordem no array que será enviada a matchMakers
			makers.push(makerOrder)
		}
		// Chama matchMakers
	}

	/**
	 * Adiciona uma ordem no mercado; Inserindo ao orderbook caso seja uma
	 * market order ou executando-a imediatamente caso seja uma taker order
	 * @param order Documento da ordem que será processado
	 */
	add(order: Order) {
		if (order.type == 'buy' && +order.price >= this.sellPrice) {
			this.execTaker(order)
		} else if (order.type == 'sell' && +order.price <= this.buyPrice) {
			this.execTaker(order)
		} else {
			this.pushMaker(order)
		}
	}
}
