import { ObjectId } from 'mongodb'
import { expect } from 'chai'
import User from '../../src/userApi/user'
import Order from '../../src/db/models/order'
import * as UserApi from '../../src/userApi'
import * as MarketApi from '../../src/marketApi'

describe('Performing basic tests on the MarketApi', () => {
	let userId: User['id']

	before(async () => {
		await Order.deleteMany({})
		const user = await UserApi.createUser('basic-test-marketApi@email.com', 'userP@ss')
		userId = user.id
	})

	it('Should fail if basic and target currency are the same', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add({
			userId,
			currency: {
				base: 'bitcoin',
				target: 'bitcoin'
			},
			amount: 1.23,
			price: 0.5
		})).to.eventually.be.rejectedWith('SameCurrencyOperation')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should fail if amount is a negative number', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add({
			userId,
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			amount: -1.23,
			price: 0.5
		})).to.eventually.be.rejectedWith('amount: -1.23 must be a positive number')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should fail if significant digits of amount are after suported from that currency', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add({
			userId,
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			amount: 0.000000000000000001,
			price: 0.5
		})).to.eventually.be.rejectedWith('amount: 0E-8 must be a positive number')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should fail if significant digits of price are after suported from the base currency', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add({
			userId,
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			amount: 0.5,
			price: 0.000000000000000001
		})).to.eventually.be.rejectedWith('price: 0E-8 must be a positive number')

		const ordersAfter = await Order.find()
		expect(ordersBefore.length).to.equal(ordersAfter.length)
	})

	it('Should add an order on the orderbook', async () => {
		const ordersBefore = await Order.find()

		await expect(MarketApi.add({
			userId,
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			amount: 2.59,
			price: 0.3
		})).to.eventually.be.fulfilled.with.an('object').that.is.instanceOf(ObjectId)

		const ordersAfter = await Order.find()
		expect(ordersBefore.length + 1).to.equal(ordersAfter.length)
	})
})
