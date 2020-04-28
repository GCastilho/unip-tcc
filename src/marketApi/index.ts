import { ObjectId } from 'mongodb'
import User from '../userApi/user'
import Order from '../db/models/order'
import { SuportedCurrencies as SC } from '../currencyApi'

interface MarketOrder {
	currency: {
		base: SC
		target: SC
	}
	type: 'buy'|'sell'
	amount: number
	price: number
}

/**
 * Adiciona uma nova ordem ao livro de ordens do mercado
 * @param order A nova odem que deve ser adicionada ao livro de ordens
 * @throws ValidationError from mongoose
 * @returns Order's opid
 */
export async function add(user: User, order: MarketOrder): Promise<ObjectId> {
	if (order.currency.base === order.currency.target) throw 'SameCurrencyOperation'

	const { base, target } = order.currency
	const total = order.amount * order.price
	const opid = new ObjectId()

	const newOrder = await new Order({
		_id: opid,
		userId: user.id,
		type: order.type,
		status: 'preparing',
		currency: {
			base,
			target
		},
		price: order.price,
		amount: order.amount,
		total,
		timestamp: new Date()
	}).save()

	try {
		await user.balanceOps.add(order.type === 'buy' ? base : target, {
			opid,
			type: 'trade',
			amount: - Math.abs(order.type === 'buy' ? total : order.amount)
		})
	} catch (err) {
		if (err === 'NotEnoughFunds')
			await newOrder.remove()
		throw err
	}

	newOrder.status = 'ready'
	await newOrder.save()

	return opid
}
