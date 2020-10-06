import '../../src/libs/extensions'
import { ObjectId, Decimal128 } from 'mongodb'
import { expect } from 'chai'
import User from '../../src/userApi/user'
import Order from '../../src/db/models/order'
import Person from '../../src/db/models/person'
import { currencyNames, currenciesObj } from '../../src/libs/currencies'
import * as UserApi from '../../src/userApi'
import * as MarketApi from '../../src/marketApi'

describe('Performing basic tests on the MarketApi', () => {
	let person: User

	before(async () => {
		await Person.deleteMany({})
		person = await UserApi.createUser('basic-test-marketApi@email.com', 'userP@ss')
	})

	beforeEach(async () => {
		// Remove as ordens do orderbook para impedir que um teste influencie outro
		for (const order of await Order.find({ status: 'ready' }))
			await MarketApi.remove(person, order._id).catch(err => {
				if (err != 'OrderNotFound' && err != 'OperationNotFound' && !err?.message?.includes('Market not found'))
					throw err
			})
		await Order.deleteMany({})

		// Manualmente seta o saldo disponível para 10
		for (const currency of currencyNames)
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.person.currencies[currency].balance.available = 10
		await person.person.save()
	})

	it('Should fail if owning and requesting currency are the same', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(person, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'bitcoin',
				amount: 2.46
			}
		})).to.eventually.be.rejectedWith('SameCurrencyOperation')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should add an order on the orderbook', async () => {
		const opid = await MarketApi.add(person, {
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

		const pending = await person.balanceOps.get('bitcoin', opid)
		expect(pending).to.be.an('object')
		expect(+pending.amount.toFullString()).to.equal(-1.23)
		expect(pending.type).to.equal('trade')
	})

	it('Should remove an order from the orderbook', async () => {
		const opid = await MarketApi.add(person, {
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

		await MarketApi.remove(person, opid)
		expect(await Order.findById(opid)).to.be.a('null', 'Order was not removed from the database')

		// Checa se a operação de alteração de saldo foi cancelada
		expect(person.balanceOps.get('bitcoin', opid)).to.eventually.be.rejectedWith('OperationNotFound')
	})

	for (let i = 0; i < currencyNames.length; i++) {
		for (let j = 0; j < currencyNames.length; j++) {
			if (i == j) continue
			const owning = currencyNames[i]
			const requesting = currencyNames[j]

			it(`Should lock ${owning}'s balance when owning ${owning} and requesting ${requesting}`, async () => {
				const opid = await MarketApi.add(person, {
					owning: {
						currency: owning,
						amount: 2.5987654321
					},
					requesting: {
						currency: requesting,
						amount: 0.3
					}
				})
				const order = await person.balanceOps.get(owning, opid)
				expect(order.type).to.equal('trade')
				expect(order.amount.toFullString()).to.equal(
					Decimal128.fromNumeric(
						-1 * 2.5987654321, currenciesObj[owning].decimals
					).toFullString()
				)
			})
		}
	}
})
