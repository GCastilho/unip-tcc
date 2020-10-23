import { expect } from 'chai'
import Order from '../../src/db/models/order'
import Trade from '../../src/db/models/trade'
import Person from '../../src/db/models/person'
import * as MarketApi from '../../src/marketApi'
import { currencyNames } from '../../src/libs/currencies'

/**
 * Alguns testes de match na market mas sem nenhum mock, para testar o match e
 * trade de ordens juntos
 */
describe.only('Performing integration tests on the MarketApi', () => {
	let person: InstanceType<typeof Person>

	before(async () => {
		await Person.deleteMany({})
		person = await Person.createOne('match-test-marketApi@email.com', 'userP@ss')
	})

	beforeEach(async () => {
		// Manualmente seta o saldo disponível para 10
		for (const currency of currencyNames)
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies[currency].balance.available = 10
		await person.save()

		// Remove as ordens do orderbook para impedir que um teste influencie outro
		for (const order of await Order.find({ status: 'ready' })) {
			await MarketApi.remove(person._id, order._id).catch(err => {
				if (
					err != 'OrderNotFound' &&
					err != 'OperationNotFound' &&
					err != 'PriceNotFound' &&
					!err?.message?.includes('Market not found')
				) throw err
			})
		}
		await Order.deleteMany({})
		await Trade.deleteMany({})
	})

	it('Should trade two equal order swith the same price and different types', async () => {
		await MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 1,
			},
			requesting: {
				currency: 'nano',
				amount: 2
			}
		})

		await MarketApi.add(person._id, {
			owning: {
				currency: 'nano',
				amount: 2
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1
			}
		})

		expect(await Order.find({}).count()).to.equals(0)
		expect(await Trade.find({}).count()).to.equals(1)
	})

	it('Should trade a maker bigger than a taker', async () => {
		const makerOpid = await MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 3
			},
			requesting: {
				currency: 'nano',
				amount: 6
			}
		})

		const takerOpid = await MarketApi.add(person._id, {
			owning: {
				currency: 'nano',
				amount: 2
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1
			}
		})

		expect(await Order.find({}).count()).to.equals(1)
		expect(await Trade.find({}).count()).to.equals(1)
		expect(await Order.findById(takerOpid)).to.be.an('object')
		expect(await Order.findById(makerOpid)).to.be.null
	})

	it('Should trade a taker bigger than a maker', async () => {
		const makerOpid = await MarketApi.add(person._id, {
			owning: {
				currency: 'nano',
				amount: 2
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1
			}
		})

		const takerOpid = await MarketApi.add(person._id, {
			owning: {
				currency: 'bitcoin',
				amount: 3
			},
			requesting: {
				currency: 'nano',
				amount: 6
			}
		})

		expect(await Order.find({}).count()).to.equals(1)
		expect(await Trade.find({}).count()).to.equals(1)
		expect(await Order.findById(makerOpid)).to.be.an('object')
		expect(await Order.findById(takerOpid)).to.be.null
	})
})
