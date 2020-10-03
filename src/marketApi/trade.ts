import assert from 'assert'
import TradeDoc from '../db/models/trade'
import { balanceOperations as BalanceOps } from '../db/models/person'
import * as UserApi from '../userApi'
import type { Order } from '../db/models/order'

export default async function trade(matchs: [Order, Order][]) {
	assert(matchs.length > 0, 'Matchs array can\'t be empty')
	for (const match of matchs) {
		assert(match.length == 2, `Orders must allways be in touples, but received ${match.length} items`)
		const [maker, taker] = match
		assert(
			maker.type == 'buy' && taker.type == 'sell' ||
			maker.type == 'sell' && taker.type == 'buy'
			, `Orders must be of type BUY and SELL, received: ${JSON.stringify(match)}`
		)
		assert(maker.owning.amount == taker.requesting.amount, `A maker order must have owning amount equal to taker order's requesting amount, found ${maker.owning.amount} and ${taker.requesting.amount} on [${maker.id}, ${taker.id}]`)
		assert(maker.requesting.amount == taker.owning.amount, `A maker order must have requesting amount equal to taker order's owning amount, found ${maker.requesting.amount} and ${taker.owning.amount} on [${maker.id}, ${taker.id}]`)

		const trade = await new TradeDoc({
			status: 'processing',
			maker: {
				userId: maker.userId,
				currency: maker.requesting.currency,
				amount: maker.requesting.amount,
				fee: 0
			},
			taker: {
				userId: taker.userId,
				currency: taker.requesting.currency,
				amount: taker.requesting.amount,
				fee: 0
			},
			timestamp: new Date()
		}).save()

		const makerUser = await UserApi.findUser.byId(maker.userId)
		const takerUser = await UserApi.findUser.byId(taker.userId)

		// Da lock na subida de saldo do requesting de ambas
		await BalanceOps.add(makerUser.id, maker.requesting.currency, {
			opid: trade._id,
			type: 'trade',
			amount: maker.requesting.amount
		})
		await BalanceOps.add(takerUser.id, taker.requesting.currency, {
			opid: trade._id,
			type: 'trade',
			amount: taker.requesting.amount
		})

		// Da unlock na descida de saldo do owning de ambas
		try {
			await BalanceOps.complete(makerUser.id, maker.owning.currency, maker._id)
		} catch (err) {
			if (err == 'OperationNotFound') {
				const error = new Error()
				error.message = `Maker order does not have a locked balance for order ${maker.id}`
				throw error
			} else {
				throw err
			}
		}
		try {
			await BalanceOps.complete(takerUser.id, taker.owning.currency, taker._id)
		} catch (err) {
			if (err == 'OperationNotFound') {
				const error = new Error()
				error.message = `Taker order does not have a locked balance for order ${taker.id}`
				throw error
			} else {
				throw err
			}
		}

		// Da unlock na subida de saldo do requesting de ambas
		await BalanceOps.complete(makerUser.id, maker.requesting.currency, trade._id)
		await BalanceOps.complete(takerUser.id, taker.requesting.currency, trade._id)

		const promises: Promise<any>[] = match.map(item => item.remove())

		trade.status = 'closed'
		promises.push(trade.save())

		await Promise.all(promises)
	}
}
