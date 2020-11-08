import '../../src/libs/extensions'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import { ImportMock } from 'ts-mock-imports'
import Order from '../../src/db/models/order'
import Person from '../../src/db/models/person'
import Market from '../../src/marketApi/market'
import { currencyNames, currenciesObj } from '../../src/libs/currencies'
import * as MarketApi from '../../src/marketApi'
import * as Trade from '../../src/marketApi/trade'
import type { SinonStub } from 'sinon'

type TradeMock = SinonStub<Parameters<typeof Trade['default']>>;

describe('Performing basic tests on the MarketApi', () => {
	let person: InstanceType<typeof Person>

	before(async () => {
		await Person.deleteMany({})
		person = await Person.createOne('basic-test-marketApi@email.com', 'userP@ss')
	})

	beforeEach(async () => {
		// Remove as ordens do orderbook para impedir que um teste influencie outro
		for (const order of await Order.find({ status: 'ready' }))
			await MarketApi.remove(person._id, order._id).catch(err => {
				if (
					err != 'OrderNotFound' &&
					err != 'OperationNotFound' &&
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

	it('Should fail if owning and requesting currency are the same', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'bitcoin',
				amount: 2.46
			}
		})).to.eventually.be.rejectedWith('OWNING currency must be different than REQUESTING currency')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should add an order on the orderbook', async () => {
		const opid = await MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			}
		})
		expect(opid).to.be.instanceOf(ObjectId)

		const order = await Order.findById(opid)
		expect(order.status).to.equal('ready')

		const pending = await Person.balanceOps.get(person._id, 'bitcoin', opid)
		expect(pending).to.be.an('object')
		expect(pending.amount).to.equal(-1.23)
		expect(pending.type).to.equal('trade')
	})

	it('Should remove an order from the orderbook', async () => {
		const opid = await MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			}
		})
		expect(await Order.findById(opid)).to.be.an('object', 'Order was not found in the database')

		await MarketApi.remove(person._id, opid)
		expect(await Order.findById(opid)).to.be.a('null', 'Order was not removed from the database')

		// Checa se a operação de alteração de saldo foi cancelada
		expect(Person.balanceOps.get(person._id, 'bitcoin', opid)).to
			.eventually.be.rejectedWith('OperationNotFound')
	})

	for (let i = 0; i < currencyNames.length; i++) {
		for (let j = 0; j < currencyNames.length; j++) {
			if (i == j) continue
			const owning = currencyNames[i]
			const requesting = currencyNames[j]

			it(`Should lock ${owning}'s balance when owning ${owning} and requesting ${requesting}`, async () => {
				const opid = await MarketApi.add(person._id, {
					owning: {
						currency: owning,
						amount: 2.5987654321
					},
					requesting: {
						currency: requesting,
						amount: 0.3
					}
				})
				const order = await Person.balanceOps.get(person._id, owning, opid)
				expect(order.type).to.equal('trade')
				expect(order.amount).to.equal(+(-1 * 2.5987654321).toFixed(currenciesObj[owning].decimals)
				)
			})
		}
	}

	it('Should return the marketPrice', async () => {
		await Promise.all([
			MarketApi.add(person._id, {
				owning: {
					currency: 'nano',
					amount: 1
				},
				requesting: {
					currency: 'bitcoin',
					amount: 2
				}
			}),
			MarketApi.add(person._id, {
				owning: {
					currency: 'bitcoin',
					amount: 1
				},
				requesting: {
					currency: 'nano',
					amount: 2
				}
			})
		])
		await expect(MarketApi.getMarketPrice('bitcoin', 'nano')).to.eventually.be
			.fulfilled.with.an('object').that.deep.equals({
				buyPrice: 0.5,
				sellPrice: 2,
				currencies: ['bitcoin', 'nano']
			})
	})

	describe('When fetching market depth', () => {
		let market: InstanceType<typeof Market>

		beforeEach(() => {
			market = new Market(['bitcoin', 'nano'])
		})

		it('Should return MarketNotFound if the pair is invalid', async () => {
			await expect(MarketApi.getMarketDepth('dilmas', 'obamas')).to
				.eventually.be.rejected.with.instanceOf(Error)
				.that.haveOwnProperty('name').that.equals('MarketNotFound')
		})

		it('Should return the market depth', async () => {
			const orders = [
				new Order({
					userId: new ObjectId(),
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
					userId: new ObjectId(),
					status: 'ready',
					owning: {
						currency: 'bitcoin',
						amount: 1,
					},
					requesting: {
						currency: 'nano',
						amount: 3
					},
					timestamp: new Date()
				}),
				new Order({
					userId: new ObjectId(),
					status: 'ready',
					owning: {
						currency: 'bitcoin',
						amount: 1,
					},
					requesting: {
						currency: 'nano',
						amount: 4
					},
					timestamp: new Date()
				})
			]

			await Promise.all(orders.map(order => market.add(order)))

			expect(market.depth).to.be.instanceOf(Array)
			expect(market.depth).to.have.lengthOf(3)
			for (const order of orders) {
				expect(market.depth.find(v => v.price === order.price)).to.be.an('object')
			}
		})

		it('Should return the sum of the requesting amounts', async () => {
			const orders = [
				new Order({
					userId: new ObjectId(),
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
					userId: new ObjectId(),
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
					userId: new ObjectId(),
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
				})
			]

			await Promise.all(orders.map(order => market.add(order)))

			expect(market.depth).to.be.instanceOf(Array)
			expect(market.depth).to.have.lengthOf(1)
			expect(market.depth[0].volume)
				.to.equals(orders.reduce((acc, order) => acc + order.requesting.amount, 0))
		})

		it('Should return depth from multiple types', async () => {
			const orders = [
				new Order({
					userId: new ObjectId(),
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
					userId: new ObjectId(),
					status: 'ready',
					owning: {
						currency: 'nano',
						amount: 2
					},
					requesting: {
						currency: 'bitcoin',
						amount: 2,
					},
					timestamp: new Date()
				})
			]

			await Promise.all(orders.map(order => market.add(order)))

			expect(market.depth).to.be.instanceOf(Array)
			expect(market.depth).to.have.lengthOf(2)
			expect(market.depth.find(v => v.type == 'buy')).to.be.an('object')
			expect(market.depth.find(v => v.type == 'sell')).to.be.an('object')
		})
	})

	describe('When bootstrapping', () => {
		let spy: TradeMock
		const orders: InstanceType<typeof Order>[] = []
		let market: Market

		before(async () => {
			for (let i = 0; i < 6; i++) {
				orders.push(new Order({
					userId: new ObjectId(),
					status: 'ready',
					owning: {
						currency: 'bitcoin',
						amount: i + 1
					},
					requesting: {
						currency: 'nano',
						amount: 10 - i,
					},
					timestamp: new Date()
				}))
			}
		})

		beforeEach(async () => {
			spy = ImportMock.mockFunction(Trade) as TradeMock
			await Order.deleteMany({})
			orders.forEach(order => order.isNew = true)
			await Promise.all(orders.map(order => order.save()))
			market = new Market(['bitcoin', 'nano'])
			await market.bootstrap()
		})

		afterEach(() => {
			spy.restore()
		})

		it('Should insert the orders into the orderbook', async () => {
			await expect(Promise.all(orders.map(order => market.remove(order))))
				.to.eventually.be.fulfilled
		})

		it('Should insert older orders first')
	})
})
