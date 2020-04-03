import { Decimal128, ObjectId } from 'mongodb'
import Order from '../db/models/order'
import { SuportedCurrencies as SC } from '../currencyApi'
import * as CurrencyApi from '../currencyApi'

interface MarketOrder {
	userId: ObjectId
	currency: {
		base: SC
		target: SC
	}
	amount: number
	price: number
}

/**
 * Adiciona uma nova ordem ao livro de ordens do mercado
 * @param order A nova odem que deve ser adicionada ao livro de ordens
 * @throws ValidationError from mongoose
 * @returns Order's opid
 */
export async function add(order: MarketOrder): Promise<ObjectId> {
	if (order.currency.base === order.currency.target) throw 'SameCurrencyOperation'

	const { decimals: baseDecimals } = CurrencyApi.detailsOf(order.currency.base)
	const { decimals: targetDecimals } = CurrencyApi.detailsOf(order.currency.target)

	const newOrder = await new Order({
		userId: order.userId,
		currency: order.currency,
		price: Decimal128.fromNumeric(order.price, baseDecimals),
		amount: Decimal128.fromNumeric(order.amount, targetDecimals),
		total: Decimal128.fromNumeric(order.amount * order.price, baseDecimals),
		timestamp: new Date()
	}).save()

	return newOrder._id
}
