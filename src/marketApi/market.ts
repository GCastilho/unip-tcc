import type { Order } from '../db/models/order'

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
	 * Retorna a primeira ordem da fila de um tipo específico, ou seja, a ordem
	 * de venda mais barata ou a ordem de compra mais cara
	 * @param type O tipo da ordem que deverá ser retornada
	 */
	private shiftOrder(type: Order['type']) {
		const price = type == 'buy' ? this.buyPrice : this.sellPrice
		const node = this.orderbook.get(price)
		if (!node) throw new Error(`Node for market price of '${price}' not found!`)
		const order = node.data.shift()
		if (node.data.length == 0) {
			// Removes node from linked list
			if (!node.previous || !node.next)
				throw new Error(`Node has missing links: ${node}`)
			node.previous.next = node.next
			node.next.previous = node.previous
			this.orderbook.delete(price)
		}
		return order
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
		 * TODO:
		 *
		 * A taker deve ser executada em sua completude, usando múltiplas makers se necessário
		 * A taker pode fazer o preço oscilar, subindo ou descendo
		 *
		 * Um while que vai puxando todas as ordens do array até o amount delas ser
		 * maior ou igual ao da taker ou o preço de uma maker ser maior que o da
		 * taker (ou menor, depende do tipo)
		 *
		 * f que recebe uma taker e um array de makers e divide a taker em várias
		 * ordens para combinar com as makers do array; Essa função poderá retornar
		 * uma ordem do valor "restante", sendo ele do array de makers ou da taker,
		 * que agora é uma ordem maker e será recolocada no livro usando unshift
		 *
		 * trade de duas ordens de preço diferente é o preço "da melhor"
		 */
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
