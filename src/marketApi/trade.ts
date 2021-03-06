import assert from 'assert'
import { EventEmitter } from 'events'
import { startSession } from 'mongoose'
import Trade from '../db/models/trade'
import Person from '../db/models/person'
import type TypedEmitter from 'typed-emitter'
import type { OrderDoc } from '../db/models/order'
import type { MarketTrade } from '../../interfaces/market'

/** Event emitter do módulo de trade */
export const events: TypedEmitter<{
	new_trade: (userId: InstanceType<typeof Person>['_id'], trade: MarketTrade) => void
}> = new EventEmitter()

/**
 * Roda alguns asserts nas ordens para garantir que elas tem os dados esperados
 * @param maker A ordem maker do match
 * @param taker A ordem taker do match
 */
function validateOrders(maker: OrderDoc, taker: OrderDoc) {
	assert(
		maker.type == 'buy' && taker.type == 'sell' ||
		maker.type == 'sell' && taker.type == 'buy'
		, `Orders must be of type BUY and SELL, received: ${JSON.stringify([maker, taker])}`
	)
	assert(maker.owning.amount == taker.requesting.amount, `A maker order must have owning amount equal to taker order's requesting amount, found ${maker.owning.amount} and ${taker.requesting.amount} on [${maker.id}, ${taker.id}]`)
	assert(maker.requesting.amount == taker.owning.amount, `A maker order must have requesting amount equal to taker order's owning amount, found ${maker.requesting.amount} and ${taker.owning.amount} on [${maker.id}, ${taker.id}]`)
}

export default async function trade(matchs: [maker: OrderDoc, taker: OrderDoc][]) {
	assert(matchs.length > 0, 'Matchs array can\'t be empty')
	for (const match of matchs) {
		assert(match.length == 2, `Orders must allways be in touples, but received ${match.length} items`)
		const [maker, taker] = match
		validateOrders(maker, taker)

		const session = await startSession()
		session.startTransaction()

		try {
			// Faz as instâncias das ordens usarem a sessão
			match.forEach(order => order.$session(session))

			const trade = await new Trade({
				status: 'closed',
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
			}).save({ session })

			// Cria a pending da subida de saldo do requesting de ambas
			await Person.balanceOps.add(maker.userId, maker.requesting.currency, {
				opid: trade._id,
				type: 'trade',
				amount: maker.requesting.amount
			}, session)
			await Person.balanceOps.add(taker.userId, taker.requesting.currency, {
				opid: trade._id,
				type: 'trade',
				amount: taker.requesting.amount
			}, session)

			// Da unlock na descida de saldo do owning de ambas
			await Person.balanceOps.complete(
				maker.userId,
				maker.owning.currency,
				maker.originalOrderId || maker._id,
				session,
				maker.owning.amount
			).catch(err => {
				throw err == 'OperationNotFound'
					? `Maker order does not have a locked balance for order ${maker.id}`
					: err
			})
			await Person.balanceOps.complete(
				taker.userId,
				taker.owning.currency,
				taker.originalOrderId || taker._id,
				session,
				taker.owning.amount
			).catch(err => {
				throw err == 'OperationNotFound'
					? `Taker order does not have a locked balance for order ${taker.id}`
					: err
			})

			// Da unlock na subida de saldo do requesting de ambas
			await Person.balanceOps.complete(maker.userId, maker.requesting.currency, trade._id, session)
			await Person.balanceOps.complete(taker.userId, taker.requesting.currency, trade._id, session)

			await Promise.all(match.map(order => order.remove()))

			await session.commitTransaction()

			match.forEach(order => events.emit('new_trade', order.userId, trade.toJSON()))
		} catch (err) {
			await session.abortTransaction()
			throw err
		} finally {
			await session.endSession()
		}
	}
}
