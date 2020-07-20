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
		/** Checa se o preço da maker está maior/menor que o preço da taker */
		public invalidPrice: (takerPrice: number, makerPrice: number) => boolean
		/** Atualiza o remaining corretamente */
		public updateRemaining: (remaining: number, price: number, currentPrice: number) => number

		constructor(type: Order['type']) {
			if (type == 'buy') {
				this.invalidPrice = (takerPrice: number, makerPrice: number) => makerPrice > takerPrice
				this.updateRemaining = (remaining: number, price: number, currentPrice: number) => {
					return remaining * (price / currentPrice)
				}
			} else {
				this.invalidPrice = (takerPrice: number, makerPrice: number) => makerPrice < takerPrice
				this.updateRemaining = (remaining: number, price: number, currentPrice: number) => {
					return remaining / (price / currentPrice)
				}
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
 * TODO: matchMakers
 *
 * f que recebe uma taker e um array de makers e divide a taker em várias
 * ordens para combinar com as makers do array; Essa função poderá retornar
 * uma ordem do valor "restante", sendo ele do array de makers ou da taker,
 * que agora é uma ordem maker e será recolocada no livro usando unshift
 *
 * trade de duas ordens de preço diferente é o preço "da melhor"
 */

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
