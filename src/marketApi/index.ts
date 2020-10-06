import { ObjectId } from 'mongodb'
import Market from './market'
import User from '../userApi/user'
import Person from '../db/models/person'
import OrderDoc from '../db/models/order'
import type { SuportedCurrencies as SC } from '../libs/currencies'
import type { Order } from '../db/models/order'

interface MarketOrder {
	owning: {
		currency: SC
		amount: number
	}
	requesting: {
		currency: SC
		amount: number
	}
}

/** Classe do objeto do erro de mercado não encontrado */
class MarketNotFound extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'MarketNotFound'
	}
}

/** Map que armazena todos os mercados de pares de currencies instanciados */
const markets = new Map<string, Market>()

/** Retorna a string chave de mercado de um par */
function getMarketKey(orderedPair: Order['orderedPair']) {
	return orderedPair.map(item => item.currency).toString()
}

/**
 * Adiciona uma nova ordem ao livro de ordens do mercado
 * @param order A nova odem que deve ser adicionada ao livro de ordens
 * @throws ValidationError from mongoose
 * @throws 'SameCurrencyOperation' if owning and requesting currency are the same
 * @returns Order's opid
 */
export async function add(user: User, order: MarketOrder): Promise<ObjectId> {
	if (order.owning.currency === order.requesting.currency) throw 'SameCurrencyOperation'

	const opid = new ObjectId()

	const orderDoc = await new OrderDoc({
		_id: opid,
		userId: user.id,
		status: 'preparing',
		...order,
		timestamp: new Date()
	}).save()

	try {
		await Person.balanceOps.add(user.id, order.owning.currency, {
			opid,
			type: 'trade',
			amount: - Math.abs(order.owning.amount)
		})
	} catch (err) {
		if (err === 'NotEnoughFunds')
			await orderDoc.remove()
		throw err
	}

	orderDoc.status = 'ready'
	await orderDoc.save()

	// Retorna ou cria uma nova instancia da Market para esse par
	let market = markets.get(getMarketKey(orderDoc.orderedPair))
	if (!market) {
		market = new Market()
		/**
		 * A chave desse par no mercado é a string do array das currencies em ordem
		 * alfabética, pois isso torna a chave simples e determinística
		 */
		markets.set(getMarketKey(orderDoc.orderedPair), market)
	}

	await market.add(orderDoc)

	return opid
}

/**
 * Remove uma ordem do mercado de ordens e do banco de dados caso ela ainda
 * não tenha sido executada
 * @param opid O id da ordem que será removida
 * @throws 'OrderNotFound' Se a ordem não existir ou já tiver sido executada
 * @throws OperationNotFound if UserApi could not found the locked operation
 * @throws MarketNotFound if the market was not found in the markets map
 */
export async function remove(user: User, opid: ObjectId) {
	// Há uma race entre a ordem ser selecionada na execTaker e o trigger no update para status 'matched'
	const order = await OrderDoc.findOneAndUpdate({ _id: opid, status: 'ready' }, { status: 'cancelled' })
	if (!order) throw 'OrderNotFound'
	const market = markets.get(getMarketKey(order.orderedPair))
	if (!market) throw new MarketNotFound(`Market not found while removing: ${order}`)
	market.remove(order)
	await order.remove()
	await Person.balanceOps.cancel(user.id, order.owning.currency, opid)
}
