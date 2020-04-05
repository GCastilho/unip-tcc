import { Decimal128, ObjectId } from 'mongodb'
import User from '../userApi/user'
import Order from '../db/models/order'
import { SuportedCurrencies as SC } from '../currencyApi'
import * as CurrencyApi from '../currencyApi'

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
	const { decimals: baseDecimals } = CurrencyApi.detailsOf(base)
	const { decimals: targetDecimals } = CurrencyApi.detailsOf(target)
	const price = Decimal128.fromNumeric(order.price, baseDecimals)
	const amount = Decimal128.fromNumeric(order.amount, targetDecimals)
	const total = Decimal128.fromNumeric(+amount * +price, baseDecimals)

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
		price,
		amount,
		total,
		timestamp: new Date()
	}).save()

	try {
		await user.balanceOps.add(order.type === 'buy' ? base : target, {
			opid,
			type: 'trade',
			amount: - (order.type === 'buy' ? total : amount)
		})
	} catch (err) {
		if (err === 'NotEnoughFunds') {
			await newOrder.remove()
		}
		throw err
	}

	newOrder.status = 'ready'
	await newOrder.save()

	return newOrder._id
}
