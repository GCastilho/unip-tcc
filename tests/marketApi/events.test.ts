import '../../src/libs/extensions'
import { expect } from 'chai'
import Order from '../../src/db/models/order'
import Person from '../../src/db/models/person'
import { currencyNames } from '../../src/libs/currencies'
import Market, { events as marketEvents } from '../../src/marketApi/market'

describe('Testing emittion of events on the market', () => {
	let userId: InstanceType<typeof Person>['_id']
	let market: InstanceType<typeof Market>

	before(async () => {
		await Person.deleteMany({})
		const person = await Person.createOne('events-test-market@email.com', 'userP@ss')
		userId = person._id
	})

	beforeEach(async () => {
		// Remove as ordens do orderbook para impedir que um teste influencie outro
		await Order.deleteMany({})
		market = new Market(['bitcoin', 'nano'])

		const person = await Person.findById(userId)
		// Manualmente seta o saldo disponível para 10
		for (const currency of currencyNames)
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies[currency].balance.available = 10
		await person.save()
	})

	it('Should emit a price_update when inserting a new buy order', done => {
		marketEvents.once('price_update', update => {
			expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
			expect(update.type).to.equal('buy')
			expect(update.price).to.equal(0.5)
			done()
		})

		market.add(new Order({
			userId: userId,
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			},
			timestamp: new Date()
		})).catch(done)
	})

	it('Should emit a price_update when inserting a sell buy order', done => {
		marketEvents.once('price_update', update => {
			expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
			expect(update.type).to.equal('sell')
			expect(update.price).to.equal(0.5)
			done()
		})

		market.add(new Order({
			userId: userId,
			status: 'ready',
			owning: {
				currency: 'nano',
				amount: 2.46
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			timestamp: new Date()
		})).catch(done)
	})

	it('Should emit a price_update when removing a buy order', done => {
		const orderDoc = new Order({
			userId: userId,
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			},
			timestamp: new Date()
		})

		market.add(orderDoc).then(() => {
			marketEvents.once('price_update', update => {
				expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
				expect(update.type).to.equal('buy')
				expect(update.price).to.equal(0)
				done()
			})
			return market.remove(orderDoc)
		}).catch(done)
	})

	it('Should emit a price_update when removing a buy order', done => {
		const orderDoc = new Order({
			userId: userId,
			status: 'ready',
			owning: {
				currency: 'nano',
				amount: 2.46
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			timestamp: new Date()
		})

		market.add(orderDoc).then(() => {
			marketEvents.once('price_update', update => {
				expect(update.currencies).to.deep.equal(['bitcoin', 'nano'])
				expect(update.type).to.equal('sell')
				expect(update.price).to.equal(Infinity)
				done()
			})
			return market.remove(orderDoc)
		}).catch(done)
	})
})
