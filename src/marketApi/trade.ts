import assert from 'assert'
import Trade from '../db/models/trade'
import Person from '../db/models/person'
import type { OrderDoc } from '../db/models/order'

export default async function trade(matchs: [maker: OrderDoc, taker: OrderDoc][]) {
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

		const trade = await new Trade({
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

		// Da lock na subida de saldo do requesting de ambas
		await Person.balanceOps.add(maker.userId, maker.requesting.currency, {
			opid: trade._id,
			type: 'trade',
			amount: maker.requesting.amount
		})
		await Person.balanceOps.add(taker.userId, taker.requesting.currency, {
			opid: trade._id,
			type: 'trade',
			amount: taker.requesting.amount
		})

		// Da unlock na descida de saldo do owning de ambas
		try {
			await Person.balanceOps.complete(maker.userId, maker.owning.currency, maker._id)
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
			await Person.balanceOps.complete(taker.userId, taker.owning.currency, taker._id)
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
		await Person.balanceOps.complete(maker.userId, maker.requesting.currency, trade._id)
		await Person.balanceOps.complete(taker.userId, taker.requesting.currency, trade._id)

		const promises: Promise<any>[] = match.map(item => item.remove())

		trade.status = 'closed'
		promises.push(trade.save())

		await Promise.all(promises)
	}
}
