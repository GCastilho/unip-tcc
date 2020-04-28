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

	it('Should fail if basic and target currency are the same', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(user, {
			currency: {
				base: 'bitcoin',
				target: 'bitcoin'
			},
			type: 'buy',
			amount: 1.23,
			price: 0.5
		})).to.eventually.be.rejectedWith('SameCurrencyOperation')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should fail if amount is a negative number', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(user, {
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			type: 'buy',
			amount: -1.23,
			price: 0.5
		})).to.eventually.be.rejectedWith('amount: -1.23 must be a positive number')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should fail if significant digits of amount are after suported from that currency', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(user, {
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			type: 'buy',
			amount: 0.000000000000000001,
			price: 0.5
		})).to.eventually.be.rejectedWith('amount: 0.0 must be a positive number')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should fail if significant digits of price are after suported from the base currency', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add(user, {
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			type: 'buy',
			amount: 0.5,
			price: 0.000000000000000001
		})).to.eventually.be.rejectedWith('price: 0.0 must be a positive number')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should add an order on the orderbook', async () => {
		const opid = await MarketApi.add(user, {
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			type: 'buy',
			amount: 2.59,
			price: 0.3
		})
		expect(opid).to.be.instanceOf(ObjectId)

		const order = await Order.findById(opid)
		expect(order.status).to.equal('ready')
	})

	for (let i = 0; i < CurrencyApi.currencies.length; i++) {
		for (let j = 0; j < CurrencyApi.currencies.length; j++) {
			if (i == j) continue
			const base = CurrencyApi.currencies[i]
			const target = CurrencyApi.currencies[j]

			describe(`When ${base} is base and ${target} is target`, () => {
				it(`Should lock ${base}'s balance when buying`, async () => {
					const opid = await MarketApi.add(user, {
						currency: {
							base,
							target
						},
						type: 'buy',
						amount: 2.59,
						price: 0.3
					})
					const order = await user.balanceOps.get(base, opid)
					expect(order.type).to.equal('trade')
					expect(order.amount.toFullString()).to.equal(
						Decimal128.fromNumeric(
							-1 * 0.3 * 2.59, CurrencyApi.detailsOf(base).decimals
						).toFullString()
					)
				})

				it(`Should lock ${target}'s balance when selling`, async () => {
					const opid = await MarketApi.add(user, {
						currency: {
							base,
							target
						},
						type: 'sell',
						amount: 2.59,
						price: 0.3
					})
					const order = await user.balanceOps.get(target, opid)
					expect(order.type).to.equal('trade')
					expect(order.amount.toFullString()).to.equal('-2.59')
				})
			})
		}
	}
})
