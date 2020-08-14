import sinon from 'sinon'
import { expect } from 'chai'
// import { ObjectId, Decimal128 } from 'mongodb'
import { ImportMock } from 'ts-mock-imports'
import User from '../../src/userApi/user'
import Order from '../../src/db/models/order'
import * as Trade from '../../src/marketApi/trade'
import * as UserApi from '../../src/userApi'
import * as MarketApi from '../../src/marketApi'
import * as CurrencyApi from '../../src/currencyApi'
import type { SinonStub } from 'sinon'

describe('Performing match tests on the MarketApi', () => {
	let user: User
	let spy: SinonStub<Parameters<typeof Trade['default']>>

	before(async () => {
		user = await UserApi.createUser('match-test-marketApi@email.com', 'userP@ss')

		// Manualmente seta o saldo disponível para 10
		for (const currency of CurrencyApi.currencies)
			// @ts-expect-error
			user.person.currencies[currency].balance.available = 10
		await user.person.save()
	})

	beforeEach(async () => {
		for (const order of await Order.find({}))
			await MarketApi.remove(order._id)
		await Order.deleteMany({})
		spy = ImportMock.mockFunction(Trade) as SinonStub<Parameters<typeof Trade['default']>>
	})

	afterEach(() => {
		spy.restore()
	})

	it('Should match two orders of the same amount if they have the same price and different types', async () => {
		const makerOpid = await MarketApi.add(user, {
			owning: {
				currency: 'bitcoin',
				amount: 1.23,
			},
			requesting: {
				currency: 'nano',
				amount: 2.46
			}
		})

		const takerOpid = await MarketApi.add(user, {
			owning: {
				currency: 'nano',
				amount: 2.46
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1.23
			}
		})

		sinon.assert.calledOnce(spy)

		const args = spy.getCall(0).args[0]
		expect(args).to.have.lengthOf(1, 'Trade function should have received precisely one match')
		expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

		const [maker, taker] = args[0]
		expect(maker.id).to.equals(makerOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
		expect(taker.id).to.equals(takerOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
	})
})
