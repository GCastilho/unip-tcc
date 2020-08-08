import OrderDoc from '../db/models/order'
import type { Order } from '../db/models/order'

/**
 * Combina uma ordem taker com ordens ordens makers, dividindo a ordem taker em
 * ordens iguais as makers, retornando-as em pares
 *
 * A ordem taker deve ter um preço igual ou "mais vantajoso" que as ordens do
 * array de makers, isto é, serem mais baratas para uma taker de compra ou mais
 * caras para uma taker de venda
 *
 * Se a quantidade (owning/requesting) das ordens for diferentes, elas serão
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
	/** Quantidade da taker (do que o usuário TEM) restante para dar match */
	let remaining = taker.owning.amount
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
	 * ordem. Se o array de makers tiver um amount requesting que soma mais que
	 * o amount do owning da taker essas ordens serão colocada no array de
	 * leftovers sem descontar o remaining
	 *
	 * Se a Market selecionou as ordens corretamente haverá apenas uma ordem no
	 * leftovers, alem disso, o preço das makers sempre será "vantajoso" para a
	 * taker, ou seja, retornará uma quantidade maior ou igual ao "requisitado"
	 * pela ordem
	 */
	for (const maker of makersIterable) {
		/** Se remaining < maker - A maker é maior que o restante da taker */
		if (remaining < maker.requesting.amount) {
			leftovers.push(maker, ...Array.from(makersIterable))
			break
		}
		remaining -= maker.requesting.amount
		// Necessário botar a transform function no schema que remove o id e set o new pra true
		const takerCopy = new OrderDoc(taker.toObject())
		takerCopy.owning.amount = maker.requesting.amount
		takerCopy.requesting.amount = maker.owning.amount
		matchs.push([maker, takerCopy])
	}

	/**
	 * Atualiza owning e requesting da taker com os valores de remaining
	 *
	 * Owning e requesting devem ficar na mesma proporção, então o requesting
	 * será atualizado na proporção em que o owning foi reduzido
	 */
	taker.requesting.amount = taker.requesting.amount * remaining / taker.owning.amount
	taker.owning.amount = remaining

	/** Array de promessas de operações no banco de dados */
	const promises: Promise<Order>[] = []

	if (remaining > 0) {
		if (leftovers.length > 0) {
			/*
			 * A primeira ordem do leftovers é maior que o remaining. Ela deve ser
			 * dividida em duas: a primeira com os amounts da taker e a segunda com o
			 * restante que será unshifted no array de leftovers
			 */
			const makerOrder = leftovers.shift() as Order

			/** Ordem com os valores da direferença; será reenviada ao leftover */
			// Necessário botar a transform function no schema que remove o id e set o new pra true
			const makerCopy = new OrderDoc(makerOrder.toObject())
			makerCopy.owning.amount = makerCopy.owning.amount - taker.requesting.amount
			makerCopy.requesting.amount = makerCopy.requesting.amount - taker.owning.amount
			leftovers.unshift(makerCopy)

			// Faz a maker ter os valores da taker
			makerOrder.owning.amount = taker.requesting.amount
			makerOrder.requesting.amount = taker.owning.amount
			matchs.push([makerOrder, taker])
		} else {
			/**
			 * Taker tem amount maior que as ordens do array de makers. Os amounts da
			 * taker já foram atualizados então é só adicioná-la no array de leftovers
			 * para ser retornada
			 */
			leftovers.push(taker)
		}
	} else {
		// A ordem teve um match completo e tem amounts iguais a zero
		promises.push(taker.remove())
	}

	// As makers do array de match não foram modificadas, não precisa salvar elas
	promises.push(...matchs.map(orders => orders[1].save()))

	// As ordens do resto podem ou não ter sido modificadas, salva todas
	promises.push(...leftovers.map(order => order.save()))

	// Não há garantia de "all or nothing" nessas operações
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
	private buyPrice: number
	/** Preço da menor ordem de venda */
	private sellPrice: number

	constructor() {
		this.orderbook = new Map()
		this.buyPrice = 0
		this.sellPrice = Infinity
		this.head = null
	}

	/**
	 * Retorna um node de um preço específico. Se esse node não existir, ele será
	 * criado e adicionado ao orderbook e a linkedList
	 * @param price O preço do node que deve ser retornado
	 */
	private getNode(price: number) {
		let node = this.orderbook.get(price)
		if (!node) {
			node = {
				price,
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

			this.orderbook.set(price, node)
		}

		return node
	}

	/**
	 * Checa se uma ordem (pré-determinada como) maker deve ou não alterar o
	 * marketPrice e, em caso positivo, faz essa alteração
	 * @param order A orderm maker que foi/será adicionada ao livro
	 */
	private updateMarketPrice(order: Order) {
		if (order.type == 'buy' && order.price > this.buyPrice) {
			this.buyPrice = order.price
		} else if (order.type == 'sell' && order.price < this.sellPrice) {
			this.sellPrice = order.price
		}
	}

	/**
	 * Adiciona uma ordem (pré-determinada como) maker ao orderbook no inicio
	 * da fila de um preço
	 *
	 * @param order A ordem maker que será adicionada
	 */
	private unshiftMaker(order: Order) {
		const node = this.getNode(order.price)
		node.data.unshift(order)
		this.updateMarketPrice(order)
	}

	/**
	 * Adiciona uma ordem (pré-determinada como) maker ao orderbook no fim
	 * da fila de um preço
	 * @param order A ordem maker que será adicionada
	 */
	private pushMaker(order: Order) {
		const node = this.getNode(order.price)
		node.data.push(order)
		this.updateMarketPrice(order)
	}

	/**
	 * Executa uma ordem (pré-determinada como) taker com uma ou mais ordens maker
	 * previamente adicionadas ao orderbook
	 *
	 * Uma ordem taker não é trocada com uma maker de mesmo preço, mas sim com
	 * ordens maker começando pelo buy/sellPrice e indo ATÉ o preço da ordem
	 *
	 * Uma ordem taker poderá, portanto, ser trocada por uma maker com um preço
	 * melhor que o estipulado na ordem (mas nunca pior), o que pode resultar no
	 * usuário recebendo uma quantidade maior que o esperado na troca
	 *
	 * @param order A ordem taker que será executada
	 */
	private async execTaker(order: Order) {
		/** A quantidade restante de quanto o usuário TEM para executar a ordem */
		let remaining = order.owning.amount

		/** Vetor de ordens maker que irão fazer trade com essa ordem taker */
		const makers: Order[] = []

		while (remaining >= 0) {
			const price = order.type == 'buy' ? this.buyPrice : this.sellPrice
			// Checa se o preço está no range válido
			if (price == 0 || price == Infinity) break
			const node = this.orderbook.get(price) as LinkedList

			// Checa se o preço do node está no limite válido para este type
			if (
				order.type == 'buy' && node.price > order.price ||
				order.type == 'sell' && node.price < order.price
			) break

			const makerOrder = node.data.shift() as Order
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

			/**
			 * Duas ordens com types diferentes tem requesting e owning de currencies
			 * iguais já que é isso que define o type (que é virtual). Ou seja, a
			 * currency que a taker TEM é a currency que a maker QUER (e vice-versa)
			 *
			 * Essa linha atualiza quanto da currency que a taker TEM (para "pagar")
			 * já foi utilizado, subtraindo o amount de mesma currency da maker
			 */
			remaining -= makerOrder.requesting.amount

			// Adiciona a ordem no array que será enviada a matchMakers
			makers.push(makerOrder)
		}

		const { matchs, leftovers } = await matchMakers(order, makers)

		/** Readiciona a ordem ao inicio do array deste preço */
		leftovers.forEach(maker => this.unshiftMaker(maker))

		// Enviar matchs à função de trade
		console.log(matchs)
	}

	/**
	 * Adiciona uma ordem no mercado; Inserindo ao orderbook caso seja uma
	 * market order ou executando-a imediatamente caso seja uma taker order
	 * @param order Documento da ordem que será processado
	 */
	add(order: Order) {
		if (order.type == 'buy' && order.price >= this.sellPrice) {
			this.execTaker(order)
		} else if (order.type == 'sell' && order.price <= this.buyPrice) {
			this.execTaker(order)
		} else {
			this.pushMaker(order)
		}
	}
}

/** Map que armazena todos os mercados de pares de currencies instanciados */
const markets = new Map<string, Market>()

/**
 * Adiciona uma ordem sistema do mercado para ser ofertada e trocada
 * @param order A ordem que será adicionada ao mercado
 */
export function add(order: Order) {
	// Retorna ou cria uma nova instancia da Market para esse par
	let market = markets.get(order.getMarketKey())
	if (!market) {
		market = new Market()
		markets.set(order.getMarketKey(), market)
	}

	market.add(order)
}
