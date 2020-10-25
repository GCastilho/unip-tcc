import '../../src/libs/extensions'
import { expect } from 'chai'
import Order from '../../src/db/models/order'
import Person from '../../src/db/models/person'
import { currencyNames } from '../../src/libs/currencies'
import * as MarketApi from '../../src/marketApi'

describe('Testing emittion of events on the MarketApi', () => {
	let person: InstanceType<typeof Person>

	before(async () => {
		await Person.deleteMany({})
		person = await Person.createOne('events-test-marketApi@email.com', 'userP@ss')
	})

	beforeEach(async () => {
		// Remove as ordens do orderbook para impedir que um teste influencie outro
		for (const order of await Order.find({ status: 'ready' }))
			await MarketApi.remove(person._id, order._id).catch(err => {
				if (
					err != 'OrderNotFound' &&
					err != 'OperationNotFound' &&
					err != 'PriceNotFound' &&
					err != 'PriceNotFound' &&
					!err?.message?.includes('Market not found')
				) throw err
			})
		await Order.deleteMany({})

		// Manualmente seta o saldo disponível para 10
		for (const currency of currencyNames)
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies[currency].balance.available = 10
		await person.save()
	})

	it('Should emit a price_update when inserting a new buy order', done => {
		MarketApi.events.once('price_update', update => {
			expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
			expect(update.type).to.equal('buy')
			expect(update.price).to.equal(0.5)
			done()
		})

		MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			}
		}).catch(done)
	})

	it('Should emit a price_update when inserting a sell buy order', done => {
		MarketApi.events.once('price_update', update => {
			expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
			expect(update.type).to.equal('sell')
			expect(update.price).to.equal(0.5)
			done()
		})

		MarketApi.add(person._id, {
			owning: {
				currency: 'nano',
				amount: 2.46
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1.23,
			}
		}).catch(done)
	})

	it('Should emit a price_update when removing a buy order', done => {
		MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			}
		}).then(opid => {
			MarketApi.events.once('price_update', update => {
				expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
				expect(update.type).to.equal('buy')
				expect(update.price).to.equal(0)
				done()
			})
			return MarketApi.remove(person._id, opid)
		}).catch(done)
	})

	it('Should emit a price_update when removing a buy order', done => {
		MarketApi.add(person._id, {
			owning: {
				currency: 'nano',
				amount: 2.46
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1.23,
			}
		}).then(opid => {
			MarketApi.events.once('price_update', update => {
				expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
				expect(update.type).to.equal('sell')
				expect(update.price).to.equal(Infinity)
				done()
			})
			return MarketApi.remove(person._id, opid)
		}).catch(done)
	})
})
