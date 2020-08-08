import '../../src/libs'
import { ObjectId, Decimal128 } from 'mongodb'
import { expect } from 'chai'
import User from '../../src/userApi/user'
import Order from '../../src/db/models/order'
import * as UserApi from '../../src/userApi'
import * as MarketApi from '../../src/marketApi'
import * as CurrencyApi from '../../src/currencyApi'

describe('Performing basic tests on the MarketApi', () => {
	let user: User

	before(async () => {
		await Order.deleteMany({})
		user = await UserApi.createUser('basic-test-marketApi@email.com', 'userP@ss')

		// Manualmente seta o saldo disponível para 10
		for (const currency of CurrencyApi.currencies) {
			user.person.currencies[currency].balance.available = Decimal128.fromNumeric(10)
		}
		await user.person.save()
	})

	it('Should fail if owning and requesting currency are the same', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(user, {
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
		const opid = await MarketApi.add(user, {
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
	})

	for (let i = 0; i < CurrencyApi.currencies.length; i++) {
		for (let j = 0; j < CurrencyApi.currencies.length; j++) {
			if (i == j) continue
			const owning = CurrencyApi.currencies[i]
			const requesting = CurrencyApi.currencies[j]

			it(`Should lock ${owning}'s balance when owning ${owning} and requesting ${requesting}`, async () => {
				const opid = await MarketApi.add(user, {
					owning: {
						currency: owning,
						amount: 2.5987654321
					},
					requesting: {
						currency: requesting,
						amount: 0.3
					}
				})
				const order = await user.balanceOps.get(owning, opid)
				expect(order.type).to.equal('trade')
				expect(order.amount.toFullString()).to.equal(
					Decimal128.fromNumeric(
						-1 * 2.5987654321, CurrencyApi.detailsOf(owning).decimals
					).toFullString()
				)
			})
		}
	}
})
