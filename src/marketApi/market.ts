import { EventEmitter } from 'events'
import Order from '../db/models/order'
import trade from './trade'
import type TypedEmitter from 'typed-emitter'
import type { OrderDoc } from '../db/models/order'
import type { PersonDoc } from '../db/models/person'
import type { SuportedCurrencies } from '../libs/currencies'
import type { MarketDepth, PriceUpdate, PriceRequest, OrderUpdate } from '../../interfaces/market'

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
	data: OrderDoc[]
}

/** Event emitter de todas as instâncias da Market */
export const events: TypedEmitter<{
	price_update: (priceUpdt: PriceUpdate) => void
	depth_update: (depth: MarketDepth) => void
	order_update: (userId: PersonDoc['_id'], orderUpdt: OrderUpdate) => void
}> = new EventEmitter()

/**
 * Decorator para emitir um evento de price update no events a cada vez que as
 * propriedades de marketPrice forem atualizadas
 */
function Emittable<T extends PriceUpdate['type']>(type: T) {
	let value: number

	return function Decorator(
		target: Record<string, any>,
		propertyKey: string,
	) {
		Object.defineProperty(target, propertyKey, {
			enumerable: true,
			get: function() {
				return value
			},
			set: function(this: Market, newPrice: typeof value) {
				value = newPrice
				if (this.emitting) {
					events.emit('price_update', {
						price: newPrice,
						currencies: this.currencies,
						type
					})
				}
			}
		})
	}
}

/**
 * Market é uma estrutura que armazena todas as ordens de todos os preços
 * desse par de currencies
 */
export default class Market {
	/** Um map com as listas de ordens separadas por preço */
	private orderbook: Map<number, LinkedList>

	/** Head da linked list */
	private head: null|LinkedList

	/** Flag de controle se a Market está emitindo eventos ou não */
	protected emitting: boolean

	/** Preço da maior ordem de compra */
	@Emittable('buy')
	private buyPrice: number

	/** Preço da menor ordem de venda */
	@Emittable('sell')
	private sellPrice: number

	/** Noma das currencies desse par ordenados alfabeticamente */
	public currencies: [SuportedCurrencies, SuportedCurrencies]

	/**
	 * WORKAROUND: Ordens que foram adicionadas antes da anterior terminar um
	 * match ficam aqui esperando para serem executadas quando ela terminar
	 */
	private pendingOrders: OrderDoc[]

	/** WORKAROUND: Flag que indica se uma ordem está sendo processada pela add */
	private trading: boolean

	constructor(currencies: [SuportedCurrencies, SuportedCurrencies]) {
		this.currencies = currencies.sort()
		this.orderbook = new Map()
		this.buyPrice = 0
		this.sellPrice = Infinity
		this.head = null
		this.emitting = true
		this.pendingOrders = []
		this.trading = false
	}

	/** Retorna o depth deste mercado */
	public get depth(): MarketDepth[] {
		const depth: MarketDepth[] = []

		for (const node of this.orderbook.values()) {
			depth.push({
				price: node.price,
				type: node.data[0].type,
				currencies: this.currencies,
				volume: node.data.reduce((acc, order) => acc + order.requesting.amount, 0)
			})
		}

		return depth
	}

	/** Retorna um objeto com buyPrice e sellPrice */
	public get prices(): PriceRequest {
		return {
			buyPrice: this.buyPrice,
			sellPrice: this.sellPrice,
			currencies: this.currencies
		}
	}

	/** Faz o bootstrap da market carregando as ordens salvas no banco */
	public async bootstrap() {
		this.emitting = false
		console.log('Beginning bootstrap for', this.currencies)
		await Order.find({
			'owning.currency': { $in: this.currencies },
			'requesting.currency': { $in: this.currencies },
			status: 'ready'
		}).sort({ timestamp: -1 })
			.cursor()
			.eachAsync(order => this.add(order))
			.catch(err => {
				console.error('Error while bootstrapping market for', this.currencies, err)
				throw err
			})
		console.log('Bootstrap complete for', this.currencies, 'market is online')
		this.emitting = true
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
				if (node.price < this.head.price) {
					node.next = this.head
					this.head.previous = node
					this.head = node
				} else {
					let previous = this.head
					while (previous.next != null && node.price > previous.next.price) {
						previous = previous.next
					}
					node.next = previous.next
					node.previous = previous
					node.previous.next = node
					if (node.next?.previous != null)
						node.next.previous = node
				}
			} else {
				this.head = node
			}

			this.orderbook.set(price, node)
		}

		return node
	}

	/**
	 * Remove uma ordem de uma posição arbitrária do array de ordens e a retorna
	 * Se o array resultante estiver vazio ele será removido do orderbook
	 * @param node O node da ordem que será retornado
	 * @param index O index da ordem será retornada
	 */
	private getOrderFromIndex(node: LinkedList, index: number) {
		const order = node.data.splice(index, 1)[0]

		// Removes node from linked list if data is empty
		if (node.data.length == 0) {
			// Atualiza os preços
			if (node.price == this.buyPrice) {
				// Atualiza o preço da maior ordem de compra para baixo
				if (node.previous) this.buyPrice = node.previous.price
				else this.buyPrice = 0
			} else if (node.price == this.sellPrice) {
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
			this.orderbook.delete(node.price)
		}

		return order
	}

	/**
	 * Checa se a inserção de uma ordem (pré-determinada como) maker deve ou não
	 * alterar o marketPrice e, em caso positivo, faz essa alteração
	 * @param order A orderm maker que foi/será adicionada ao livro
	 */
	private updateMarketPrice(order: OrderDoc) {
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
	private unshiftMaker(order: OrderDoc) {
		const node = this.getNode(order.price)
		node.data.unshift(order)
		this.updateMarketPrice(order)
	}

	/**
	 * Adiciona uma ordem (pré-determinada como) maker ao orderbook no fim
	 * da fila de um preço
	 * @param maker A ordem maker que será adicionada
	 */
	private pushMaker(maker: OrderDoc) {
		const node = this.getNode(maker.price)
		node.data.push(maker)
		this.updateMarketPrice(maker)
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
	 * @param taker A ordem taker que será executada
	 */
	private async execTaker(taker: OrderDoc) {
		/** Array de touples [maker, taker] */
		const matchs: [OrderDoc, OrderDoc][] = []

		/**
		 * Array de 'resto' de ordens que não foram feitas match completamente e
		 * devem ser recolocadas no orderbook
		 */
		const leftovers: OrderDoc[] = []

		/** A quantidade restante de quanto o usuário TEM para executar a ordem */
		let remaining = taker.owning.amount

		/**
		 * Faz match da taker com as ordens maker que estão no livro
		 *
		 * O match será feito na faixa entre buy/sellPrice e o preço da ordem, sendo
		 * sempre o preço mais vantajoso ou igual ao que a taker requisitou. Como
		 * resultado, o amount do requesting da taker no match poderá será maior
		 * que o que originalmente estava na taker, mas nunca menor
		 *
		 * Uma ordem que for feito match parcial será colocada no array de leftovers
		 * para ser retornada ao livro
		 *
		 * O for irá rodar enquando o preço estiver em uma faixa aceitável
		 * (> 0 e < Infinity), enquanto a taker ainda tiver owning para fazer match
		 * e enquanto o preço for mais barato ou igual para uma ordem de compra ou
		 * mais caro ou igual em uma ordem de venda
		 */
		for (
			let price = taker.type == 'buy' ? this.sellPrice : this.buyPrice;
			price > 0 && price < Infinity && (
				taker.type == 'buy' && price <= taker.price ||
				taker.type == 'sell' && price >= taker.price
			) && remaining > 0;
			price = taker.type == 'buy' ? this.sellPrice : this.buyPrice
		) {
			const node = this.orderbook.get(price)
			if (!node) throw new Error('There is no orders on the requested price')
			const maker = this.getOrderFromIndex(node, 0)

			if (remaining > maker.requesting.amount) {
				/**
				 * Divide a taker em uma ordem com amounts e preço da maker. O preço da
				 * maker sempre será melhor (mais vantajoso) ou igual ao da taker,
				 * então a mudança de preço não é um problema
				 */
				const takerCopy = taker.split(
					maker.requesting.amount,
					maker.owning.amount,
					maker.price
				)

				matchs.push([maker, takerCopy])
			} else if (taker.owning.amount < maker.requesting.amount) {
				/** Divide a maker em uma ordem com os valores da taker (para o match) */
				const makerCopy = maker.split(
					taker.requesting.amount,
					taker.owning.amount
				)

				/** Envia o restante da maker de volta ao orderbook */
				leftovers.push(maker)

				matchs.push([makerCopy, taker])
			} else {
				/**
				 * Se o código cair aqui, então
				 * taker.owning.amount == maker.requesting.amount
				 * Entretando, se as ordens tiverem preços diferentes, o reverso
				 * (requesting da taker e owning da maker) não é válido
				 *
				 * Como a maker nunca tem um owning que é desvantajoso ao requesting
				 * da taker, então essa linha garante que os valores sejam iguais sem
				 * prejudicar a taker, garantindo o preço igual que as ordens precisam
				 * ter para um 'match' ser feito
				 */
				taker.requesting.amount = maker.owning.amount
				matchs.push([maker, taker])
			}

			/**
			 * Duas ordens com types diferentes tem requesting e owning de currencies
			 * iguais já que é isso que define o type (que é virtual). Ou seja, a
			 * currency que a taker TEM é a currency que a maker QUER (e vice-versa)
			 *
			 * Essa linha atualiza quanto da currency que a taker TEM (para "pagar")
			 * já foi utilizado, subtraindo o amount de mesma currency da maker
			 */
			remaining -= maker.requesting.amount
		}

		// Taker não executou completamente
		if (remaining > 0) {
			leftovers.push(taker)
		}

		/** Array de promessas de operações no banco de dados */
		const promises: Promise<OrderDoc>[] = []

		// Salva as ordens do match no banco de dados com o journaling atualizado
		promises.push(...matchs.flatMap(orders => orders.map(order => {
			order.status = 'matched'
			return order.save()
		})))

		/** Salva as ordens do leftovers */
		promises.push(...leftovers.map(order => order.save()))

		/** Readiciona a ordem ao inicio do array deste preço */
		leftovers.forEach(maker => this.unshiftMaker(maker))

		// Não há garantia de "all or nothing" nessas operações
		await Promise.all(promises)

		// Envia os matchs à função de trade
		await trade(matchs)

		// Emite o evento de atualização de todas as ordens
		matchs.flat().forEach(order => {
			events.emit('order_update', order.userId, {
				opid: (order.originalOrderId || order._id).toHexString(),
				status: order.originalOrderId ? 'open' : 'close',
				completed: order.originalOrderId ? {
					owning: order.owning.amount,
					requesting: order.requesting.amount
				} : undefined,
			} as OrderUpdate)
		})
	}

	/**
	 * Adiciona uma ordem no mercado; Inserindo ao orderbook caso seja uma
	 * maker order ou executando-a imediatamente caso seja uma taker order
	 * @param order Documento da ordem que será processado
	 */
	async add(order: OrderDoc) {
		if (this.trading) return this.pendingOrders.push(order)
		this.trading = true

		if (
			order.type == 'buy' && order.price >= this.sellPrice ||
			order.type == 'sell' && order.price <= this.buyPrice
		) {
			await this.execTaker(order)
		} else {
			this.pushMaker(order)
		}
		console.log('orderbook state after order execution:', this.orderbook)

		/**
		 * Deveria emitir o update apenas daquele preço, mas como calcular isso na
		 * estrutura atual vai ser mto trampo, vou mandar um evento de atualização
		 * de todos os depths
		 */
		this.depth.forEach(depth => events.emit('depth_update', depth))

		this.trading = false
		const firstPending = this.pendingOrders.shift()
		if (firstPending) return this.add(firstPending)
	}

	/**
	 * Remove uma ordem do array de um node e atualiza os preços de mercado
	 * Se a ordem for a última do node ele também será removido do orderbook
	 * @param order A ordem que deverá ser removida
	 */
	async remove(order: OrderDoc) {
		const node = this.orderbook.get(order.price)
		if (!node) throw 'PriceNotFound'
		const index = node.data.findIndex(v => v.id == order.id)
		if (index == -1) throw 'OrderNotFound'
		this.getOrderFromIndex(node, index)
		console.log('orderbook state after order removal:', this.orderbook)

		/** Mesmo comment que essa parte no add */
		this.depth.forEach(depth => events.emit('depth_update', depth))
	}
}
