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
		await Order.deleteMany({ status: 'matched' })
		for (const order of await Order.find({ status: 'ready' }))
			await MarketApi.remove(order._id)
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

	describe('If the maker is bigger than the taker', () => {
		const makerOrder: Parameters<typeof MarketApi['add']>[1] = {
			owning: {
				currency: 'bitcoin',
				amount: 3
			},
			requesting: {
				currency: 'nano',
				amount: 6
			}
		}

		const takerOrder: Parameters<typeof MarketApi['add']>[1] = {
			owning: {
				currency: 'nano',
				amount: 2
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1
			}
		}

		it('Should split the maker order in two and send to trade a pair with the same amount', async () => {
			const makerOpid = await MarketApi.add(user, makerOrder)
			const takerOpid = await MarketApi.add(user, takerOrder)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(1, 'Trade function should have received precisely one match')
			expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

			const [maker, taker] = args[0]

			// Testa se as ordens foram enviadas com o valor correto
			expect(maker.id).to.not.equals(makerOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
			expect(taker.id).to.equals(takerOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
			expect(maker.owning.currency).to.equals(taker.requesting.currency)
			expect(maker.owning.amount).to.equals(taker.requesting.amount)
			expect(maker.requesting.amount).to.equals(taker.owning.amount)
			expect(maker.requesting.currency).to.equals(taker.owning.currency)

			// Testa se a maker está salva no banco
			expect(await Order.findById(maker.id)).to.be.an('object')

			// Testa se a maker original está no banco com os amounts de maker - taker
			const remainingOrder = await Order.findById(makerOpid)
			expect(remainingOrder.owning.amount).to.equal(makerOrder.owning.amount - takerOrder.requesting.amount)
			expect(remainingOrder.requesting.amount).to.equal(makerOrder.requesting.amount - takerOrder.owning.amount)
		})
	})
})
