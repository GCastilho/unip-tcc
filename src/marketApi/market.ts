import assert from 'assert'
import { ObjectId } from 'mongodb'
import OrderDoc from '../db/models/order'
import trade from './trade'
import type User from '../userApi/user'
import type { Order } from '../db/models/order'

/**
 * Combina uma ordem taker com ordens ordens makers, dividindo a ordem taker em
 * ordens iguais as makers, retornando-as em pares
 *
 * A ordem taker deve ter um preço igual ou "mais vantajoso" que as ordens do
 * array de makers, isto é, serem mais baratas para uma taker de compra ou mais
 * caras para uma taker de venda
 *
 * Se o amount owning da taker for diferente da soma dos amounts requesting das
 * makers, uma ordem com a diferença será retornada em um array de 'leftovers',
 * sendo esta o restante da taker ou das makers
 */
async function matchMakers(taker: Order, makers: Order[]) {
	assert(makers.length > 0, 'Makers array must have at least one item')

	/** Quantidade da taker (do que o usuário TEM) restante para dar match */
	let remaining = taker.owning.amount

	/** Array de touples [maker, taker] */
	const matchs: [Order, Order][] = []

	/**
	 * Array de 'resto', ordens que não foram feitas match e devem ser
	 * recolocadas no orderbook
	 */
	const leftovers: Order[] = []

	/**
	 * Itera pelo array de makers criando cópias da taker para fazer match com
	 * cada uma das makers. Quando/se uma maker for maior que o restante coloca-a
	 * no array de leftovers junto com o resto do array sem descontar o remaining
	 *
	 * Se a Market selecionou as ordens corretamente haverá apenas uma ordem no
	 * leftovers, alem disso, o preço das makers sempre será "vantajoso" para a
	 * taker, ou seja, o amount do requesting da taker no match será maior que o
	 * que originalmente estava na taker
	 *
	 * O for irá rodar enquando
	 * 'i < makers.length && remaining > maker.requesting.amount' for true,
	 * qdo isso não for mais verdade, executa o push e retorna 0
	 */
	for (
		let i = 0, maker = makers[0];
		i < makers.length && remaining > maker.requesting.amount || leftovers.push(...makers.slice(i)) & 0;
		i++, remaining -= maker.requesting.amount, maker = makers[i]
	) {
		const takerCopy = new OrderDoc(taker)
		takerCopy._id = new ObjectId()
		takerCopy.isNew = true

		takerCopy.owning.amount = maker.requesting.amount
		takerCopy.requesting.amount = maker.owning.amount
		matchs.push([maker, takerCopy])
	}

	/**
	 * Atualiza owning e requesting da taker com os valores do remaining
	 *
	 * Owning e requesting devem ficar na mesma proporção, então o requesting
	 * será atualizado na proporção em que o owning foi reduzido
	 */
	taker.requesting.amount = taker.requesting.amount * remaining / taker.owning.amount
	taker.owning.amount = remaining

	/** Se owning.amount > 0: A taker não foi executada completamente */
	if (taker.owning.amount > 0) {
		if (leftovers.length > 0) {
			const maker = leftovers.shift() as Order
			if (taker.owning.amount < maker.requesting.amount) {
				/*
				 * A maker é maior que o restante da taker. Ela deve ser
				 * dividida em duas:
				 * a primeira com os amounts da taker para ser enviada ao match
				 * e a segunda com o restante que deverá retornar ao orderbook
				 */

				// Ordem com os valores da diferença entre maker e taker
				maker.owning.amount = maker.owning.amount - taker.requesting.amount
				maker.requesting.amount = maker.requesting.amount - taker.owning.amount
				leftovers.push(maker)

				/** Ordem com os valores da taker (para o match) */
				const makerCopy = new OrderDoc(maker)
				makerCopy._id = new ObjectId()
				makerCopy.isNew = true
				makerCopy.owning.amount = taker.requesting.amount
				makerCopy.requesting.amount = taker.owning.amount

				matchs.push([makerCopy, taker])
			} else {
				// taker.owning.amount == maker.requesting.amount
				matchs.push([maker, taker])
			}
		} else {
			/**
			 * Taker tem amount maior que as ordens do array de makers. Os amounts da
			 * taker já foram atualizados então é só adicioná-la no array de leftovers
			 * para ser retornada e adicionada ao livro
			 */
			leftovers.push(taker)
		}
	}

	/** Array de promessas de operações no banco de dados */
	const promises: Promise<Order>[] = []

	// Salva as ordens do match no banco de dados com o journaling atualizado
	promises.push(...matchs.flatMap(orders => orders.map(order => {
		order.status = 'matched'
		return order.save()
	})))

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
	 * Remove o node da linked list se o array da data estiver vazio e atualiza
	 * buy/sellPrice caso o node removido tenha preços iguais a um deles
	 * @param node O node que deverá ser checado para remoção
	 */
	private removeNodeIfEmpty(node: LinkedList) {
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
	 * Checa se a inserção de uma ordem (pré-determinada como) maker deve ou não
	 * alterar o marketPrice e, em caso positivo, faz essa alteração
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
			const price = order.type == 'buy' ? this.sellPrice : this.buyPrice
			// Checa se o preço está no range válido
			if (price == 0 || price == Infinity) break

			// Checa se o preço de mercado está no limite válido para este type
			if (
				order.type == 'buy' && price > order.price ||
				order.type == 'sell' && price < order.price
			) break

			const node = this.orderbook.get(price)
			if (!node) throw new Error('There is no orders on the requested price')
			const makerOrder = node.data.shift() as Order
			this.removeNodeIfEmpty(node)

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

		// Envia os matchs à função de trade
		await trade(matchs)
	}

	/**
	 * Adiciona uma ordem no mercado; Inserindo ao orderbook caso seja uma
	 * market order ou executando-a imediatamente caso seja uma taker order
	 * @param order Documento da ordem que será processado
	 */
	async add(order: Order) {
		if (order.type == 'buy' && order.price >= this.sellPrice) {
			await this.execTaker(order)
		} else if (order.type == 'sell' && order.price <= this.buyPrice) {
			await this.execTaker(order)
		} else {
			this.pushMaker(order)
		}
	}

	/**
	 * Remove uma ordem do array de um node e atualiza os preços de mercado
	 * Se a ordem for a última do node ele também será removido do orderbook
	 * @param order A ordem que deverá ser removida
	 */
	remove(order: Order) {
		const node = this.orderbook.get(order.price) as LinkedList
		const index = node.data.findIndex(v => v.id == order.id)
		if (index == -1) throw 'OrderNotFound'
		node.data.splice(index, 1)
		this.removeNodeIfEmpty(node)
	}
}

/** Map que armazena todos os mercados de pares de currencies instanciados */
const markets = new Map<string, Market>()

/** Retorna a string chave do mercado de um par */
function getMarketKey(orderedPair: Order['orderedPair']) {
	return orderedPair.map(item => item.currency).toString()
}

/**
 * Adiciona uma ordem a um mercado para ser ofertada e trocada
 * @param order A ordem que será adicionada ao mercado
 */
export async function add(order: Order) {
	// Retorna ou cria uma nova instancia da Market para esse par
	let market = markets.get(getMarketKey(order.orderedPair))
	if (!market) {
		market = new Market()
		/**
		 * A chave desse par no mercado é a string do array das currencies em ordem
		 * alfabética, pois isso torna a chave simples e determinística
		 */
		markets.set(getMarketKey(order.orderedPair), market)
	}

	await market.add(order)
}

/**
 * Remove uma ordem do mercado de ordens e do banco de dados caso ela ainda
 * não tenha sido executada
 * @param opid O id da ordem que será removida
 * @throws OrderNotFound Se a ordem não existir ou já tiver sido executada
 * @throws Error - "Market not found"
 */
export async function remove(user: User, opid: ObjectId) {
	// Há uma race entre a ordem ser selecionada na execTaker e o trigger no update para status 'matched'
	const order = await OrderDoc.findOneAndUpdate({ _id: opid, status: 'ready' }, { status: 'cancelled' })
	if (!order) throw 'OrderNotFound'
	const market = markets.get(getMarketKey(order.orderedPair))
	if (!market) throw new Error(`Market not found while removing ${order}`)
	market.remove(order)
	await order.remove()
	await user.balanceOps.cancel(order.owning.currency, opid)
}
