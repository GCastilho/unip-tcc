import '../../src/libs/extensions'
import { expect } from 'chai'
import { ImportMock } from 'ts-mock-imports'
import Order from '../../src/db/models/order'
import Person from '../../src/db/models/person'
import { currencyNames } from '../../src/libs/currencies'
import Market, { events as marketEvents } from '../../src/marketApi/market'
import * as Trade from '../../src/marketApi/trade'
import type { SinonStub } from 'sinon'

type TradeMock = SinonStub<Parameters<typeof Trade['default']>>;

describe('Testing emittion of events on the market', () => {
	let userId: InstanceType<typeof Person>['_id']
	let market: InstanceType<typeof Market>
	let spy: TradeMock

	before(async () => {
		await Person.deleteMany({})
		const person = await Person.createOne('events-test-market@email.com', 'userP@ss')
		userId = person._id
	})

	beforeEach(async () => {
		spy = ImportMock.mockFunction(Trade) as TradeMock

		// Remove as ordens do orderbook para impedir que um teste influencie outro
		await Order.deleteMany({})
		// Instancia a market com a ordem reversa para tbm testar o sort do array
		market = new Market(['nano', 'bitcoin'])

		const person = await Person.findById(userId)
		// Manualmente seta o saldo disponível para 10
		for (const currency of currencyNames)
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies[currency].balance.available = 10
		await person.save()
	})

	afterEach(() => {
		spy.restore()
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

	// Check completed amount
	it('Should emit an order_update with status open if the order was partially executed', done => {
		// Duas ordens que irão se completar
		const orderDocs = [
			new Order({
				userId: userId,
				status: 'ready',
				owning: {
					currency: 'bitcoin',
					amount: 1,
				},
				requesting: {
					currency: 'nano',
					amount: 2
				},
				timestamp: new Date()
			}),
			new Order({
				userId: userId,
				status: 'ready',
				owning: {
					currency: 'nano',
					amount: 2
				},
				requesting: {
					currency: 'bitcoin',
					amount: 1,
				},
				timestamp: new Date()
			})
		]

		marketEvents.once('order_update', (_userId, orderUpdt) => {
			expect(_userId).to.deep.equals(userId)
			expect(orderUpdt.opid).to.be.a('string')
			expect(orderUpdt.status).to.equal('close')
			// @ts-expect-error Testando se o objeto segue a interface
			expect(orderUpdt.completed).to.be.undefined
			done()
		})

		Promise.all(orderDocs.map(order => market.add(order))).catch(done)
	})

	// Check completed amount is non existent
	it('Should emit an order_update with status close if the order was completed', done => {
		// Duas ordens que NÃO irão se completar
		const orderDocs = [
			new Order({
				userId: userId,
				status: 'ready',
				owning: {
					currency: 'bitcoin',
					amount: 2,
				},
				requesting: {
					currency: 'nano',
					amount: 4
				},
				timestamp: new Date()
			}),
			new Order({
				userId: userId,
				status: 'ready',
				owning: {
					currency: 'nano',
					amount: 2
				},
				requesting: {
					currency: 'bitcoin',
					amount: 1,
				},
				timestamp: new Date()
			})
		] as const

		marketEvents.once('order_update', (_userId, orderUpdt) => {
			expect(_userId).to.deep.equals(userId)
			expect(orderUpdt.opid).to.be.a('string')
			expect(orderUpdt.status).to.equal('open')

			// Check extra para o compilador parar de reclamar
			if (orderUpdt.status != 'open') throw 'Expected status to be open'

			expect(orderUpdt.completed).to.be.an('object')
			expect(orderUpdt.completed.owning).to.equal(1)
			expect(orderUpdt.completed.requesting).to.equal(2)
			done()
		})

		Promise.all(orderDocs.map(order => market.add(order))).catch(done)
	})
})
