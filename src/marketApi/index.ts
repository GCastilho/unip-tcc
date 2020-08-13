import { ObjectId } from 'mongodb'
import User from '../userApi/user'
import Order from '../db/models/order'
import * as market from './market'
import { SuportedCurrencies as SC } from '../currencyApi'

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

/**
 * Adiciona uma nova ordem ao livro de ordens do mercado
 * @param order A nova odem que deve ser adicionada ao livro de ordens
 * @throws ValidationError from mongoose
 * @returns Order's opid
 */
export async function add(user: User, order: MarketOrder): Promise<ObjectId> {
	if (order.owning.currency === order.requesting.currency) throw 'SameCurrencyOperation'

	const opid = new ObjectId()

	const orderDoc = await new Order({
		_id: opid,
		userId: user.id,
		status: 'preparing',
		...order,
		timestamp: new Date()
	}).save()

	try {
		await user.balanceOps.add(order.owning.currency, {
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

	market.add(orderDoc)

	return opid
}

/**
 * Remove uma ordem do mercado de ordens e do banco de dados caso ela ainda
 * não tenha sido executada
 * @param opid O id da ordem que será removida
 * @throws OrderNotFound Se a ordem não existir ou já tiver sido executada
 */
export async function remove(opid: ObjectId) {
	await market.remove(opid)
}
