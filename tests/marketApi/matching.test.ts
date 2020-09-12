import sinon from 'sinon'
import { expect } from 'chai'
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
	})

	beforeEach(async () => {
		// Manualmente seta o saldo disponível para 10
		for (const currency of CurrencyApi.currencies)
			// @ts-expect-error
			user.person.currencies[currency].balance.available = 10
		await user.person.save()

		// Remove as ordens do orderbook para impedir que um teste influencie outro
		for (const order of await Order.find({ status: 'ready' }))
			await MarketApi.remove(user, order._id).catch(err => {
				if (
					err != 'OrderNotFound' &&
					err != 'OperationNotFound' &&
					err != 'PriceNotFound' &&
					!err?.message?.includes('Market not found')
				) throw err
			})
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

	// Insere 2 makers iguais e uma taker com amount que deve dar match apenas na primeira delas
	it('Should not match more orders than owning amount', async () => {
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
				amount: 6
			},
			requesting: {
				currency: 'bitcoin',
				amount: 3
			}
		}

		const makersOpid: Parameters<Parameters<ReturnType<typeof MarketApi['add']>['then']>[0]>[0][] = []
		makersOpid.push(await MarketApi.add(user, makerOrder))
		makersOpid.push(await MarketApi.add(user, makerOrder))

		const takerOpid = await MarketApi.add(user, takerOrder)

		sinon.assert.calledOnce(spy)

		const args = spy.getCall(0).args[0]
		expect(args).to.have.lengthOf(1, 'Trade function should have received precisely one match')
		expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

		const [maker, taker] = args[0]

		// Testa se as ordens foram enviadas com o valor correto
		expect(maker.id).to.equals(makersOpid[0].toHexString(), 'First item\'s id mismatch expected maker opid')
		expect(taker.id).to.equals(takerOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
		expect(maker.owning.currency).to.equals(taker.requesting.currency)
		expect(maker.owning.amount).to.equals(taker.requesting.amount)
		expect(maker.requesting.amount).to.equals(taker.owning.amount)
		expect(maker.requesting.currency).to.equals(taker.owning.currency)
		expect(maker.status).to.equals('matched')
		expect(taker.status).to.equals('matched')

		// Testa se a segunda maker está salva no banco
		expect(await Order.findOne({
			_id: makersOpid[1],
			status: 'ready'
		})).to.be.an('object')

		// Testa se nenhuma ordem foi dividida
		expect(await Order.find({})).to.have.lengthOf(3)
	})

	describe('If maker is bigger than taker', () => {
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

		it('Should put the leftover order back on the orderbook', async () => {
			const makerOpid = await MarketApi.add(user, makerOrder)
			await MarketApi.add(user, takerOrder)

			// Envia uma segunda ordem com os amounts que a leftover deve ter
			const secondTakerOpid = await MarketApi.add(user, {
				owning: {
					currency: 'nano',
					amount: makerOrder.requesting.amount - takerOrder.owning.amount
				},
				requesting: {
					currency: 'bitcoin',
					amount: makerOrder.owning.amount - takerOrder.requesting.amount
				}
			})

			sinon.assert.calledTwice(spy)

			const args = spy.getCall(1).args[0]
			expect(args).to.have.lengthOf(1, 'Trade function should have received precisely two matches')
			expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

			const [maker, taker] = args[0]

			// Testa se as ordens foram enviadas com o valor correto
			expect(maker.id).to.equals(makerOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
			expect(taker.id).to.equals(secondTakerOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
			expect(maker.owning.currency).to.equals(taker.requesting.currency)
			expect(maker.owning.amount).to.equals(taker.requesting.amount)
			expect(maker.requesting.amount).to.equals(taker.owning.amount)
			expect(maker.requesting.currency).to.equals(taker.owning.currency)

			// Testa se todas as ordens 'ready' foram executadas
			expect(await Order.find({ status: 'ready' })).to.have.lengthOf(0)
		})
	})

	describe('If taker is bigger than maker', () => {
		const makerOrder: Parameters<typeof MarketApi['add']>[1] = {
			owning: {
				currency: 'nano',
				amount: 2
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1
			}
		}

		const takerOrder: Parameters<typeof MarketApi['add']>[1] = {
			owning: {
				currency: 'bitcoin',
				amount: 3
			},
			requesting: {
				currency: 'nano',
				amount: 6
			}
		}

		it('Should split the taker order in two and send to trade a pair with the same amount', async () => {
			const makerOpid = await MarketApi.add(user, makerOrder)
			const takerOpid = await MarketApi.add(user, takerOrder)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(1, 'Trade function should have received precisely one match')
			expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

			const [maker, taker] = args[0]

			// Testa se as ordens foram enviadas com o valor correto
			expect(maker.id).to.equals(makerOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
			expect(taker.id).to.not.equals(takerOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
			expect(maker.owning.currency).to.equals(taker.requesting.currency)
			expect(maker.owning.amount).to.equals(taker.requesting.amount)
			expect(maker.requesting.amount).to.equals(taker.owning.amount)
			expect(maker.requesting.currency).to.equals(taker.owning.currency)

			// Testa se a taker está salva no banco
			expect(await Order.findById(taker.id)).to.be.an('object')

			// Testa se a taker original está no banco com os amounts de maker - taker
			const remainingOrder = await Order.findById(takerOpid)
			expect(remainingOrder.owning.amount).to.equal(takerOrder.owning.amount - makerOrder.requesting.amount)
			expect(remainingOrder.requesting.amount).to.equal(takerOrder.requesting.amount - makerOrder.owning.amount)
		})

		it('Should put the leftover order on the orderbook as a maker', async () => {
			await MarketApi.add(user, makerOrder)
			/*
			 * Essa primeira taker será executada parcialmente. Sua leftover será
			 * adicionada ao livro como uma maker
			 */
			const takerOpid = await MarketApi.add(user, takerOrder)

			// Envia uma segunda ordem com os amounts que a leftover deve ter
			const secondTakerOpid = await MarketApi.add(user, {
				owning: {
					currency: 'nano',
					amount: takerOrder.requesting.amount - makerOrder.owning.amount
				},
				requesting: {
					currency: 'bitcoin',
					amount: takerOrder.owning.amount - makerOrder.requesting.amount
				}
			})

			sinon.assert.calledTwice(spy)

			const args = spy.getCall(1).args[0]
			expect(args).to.have.lengthOf(1, 'Trade function should have received precisely two matches')
			expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

			const [maker, taker] = args[0]

			// Testa se as ordens foram enviadas com o valor correto
			expect(maker.id).to.equals(takerOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
			expect(taker.id).to.equals(secondTakerOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
			expect(maker.owning.currency).to.equals(taker.requesting.currency)
			expect(maker.owning.amount).to.equals(taker.requesting.amount)
			expect(maker.requesting.amount).to.equals(taker.owning.amount)
			expect(maker.requesting.currency).to.equals(taker.owning.currency)

			// Testa se todas as ordens 'ready' foram executadas
			expect(await Order.find({ status: 'ready' })).to.have.lengthOf(0)
		})

		it('Should match multiple makers on the same request and send them to trade', async () => {
			const makersOpid: Parameters<Parameters<ReturnType<typeof MarketApi['add']>['then']>[0]>[0][] = []

			// Indica quantas ordens maker são necessárias para ter o amount mínimo da maker
			const matchs = takerOrder.owning.amount / makerOrder.requesting.amount

			// Adiciona a quantidade de makers necessária para ter amount igual (ou maior) a taker
			for (let i = matchs; i > 0; i--)
				makersOpid.push(await MarketApi.add(user, makerOrder))

			const takerOpid = await MarketApi.add(user, takerOrder)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(matchs, `Trade function should have received precisely ${matchs} match(s)`)
			for (let i = 0; i < args.length; i++) {
				expect(args[i]).to.have.lengthOf(2, 'Trade function was not called with a touple')

				// Testa se os opids enviados estão corretos
				const [maker, taker] = args[i]
				expect(maker.id).to.equal(makersOpid[i].toHexString())
				if (i == args.length - 1) expect(taker.id).to.equal(takerOpid.toHexString())
				else expect(taker.id).to.not.equal(takerOpid.toHexString())

				// Testa se as ordens foram enviadas com o valor correto
				expect(maker.owning.currency).to.equals(taker.requesting.currency)
				expect(maker.owning.amount).to.equals(taker.requesting.amount)
				expect(maker.requesting.amount).to.equals(taker.owning.amount)
				expect(maker.requesting.currency).to.equals(taker.owning.currency)

				// Testa se a taker está salva no banco
				expect(await Order.findById(taker.id)).to.be.an('object')
			}
		})
	})

	describe('If adding an order that is beyond the market price', () => {
		it('Should match with the order at the buy price', async () => {
			// Ordem de compra com preço 0.5
			const buyOrder: Parameters<typeof MarketApi['add']>[1] = {
				owning: {
					currency: 'bitcoin',
					amount: 3
				},
				requesting: {
					currency: 'nano',
					amount: 6
				}
			}

			// Ordem de venda com preço 3/8 -> 0.375
			const sellOrder: Parameters<typeof MarketApi['add']>[1] = {
				owning: {
					currency: 'nano',
					amount: 8
				},
				requesting: {
					currency: 'bitcoin',
					amount: 3
				}
			}

			const buyOpid = await MarketApi.add(user, buyOrder)
			const sellOpid = await MarketApi.add(user, sellOrder)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(1, 'Trade function should have received precisely one match')
			expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

			const [maker, taker] = args[0]

			// Testa se as ordens foram enviadas com o valor correto
			expect(maker.id).to.equals(buyOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
			expect(taker.id).to.not.equals(sellOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
			expect(maker.owning.currency).to.equals(taker.requesting.currency)
			expect(maker.owning.amount).to.equals(taker.requesting.amount)
			expect(maker.requesting.amount).to.equals(taker.owning.amount)
			expect(maker.requesting.currency).to.equals(taker.owning.currency)

			// Testa se o resto da sell está salva no banco
			const remaining = await Order.findById(sellOpid)
			expect(remaining).to.be.an('object')
			expect(remaining.owning.amount).to.equal(sellOrder.owning.amount - buyOrder.requesting.amount)
			expect(remaining.price).to.equal(new Order(sellOrder).price)
		})

		it('Should match with the order at the sell price', async () => {
			// Ordem de venda com preço 0.5/1 -> 0.5
			const sellOrder: Parameters<typeof MarketApi['add']>[1] = {
				owning: {
					currency: 'nano',
					amount: 1
				},
				requesting: {
					currency: 'bitcoin',
					amount: 0.5
				}
			}

			// Ordem de compra com preço 1
			const buyOrder: Parameters<typeof MarketApi['add']>[1] = {
				owning: {
					currency: 'bitcoin',
					amount: 0.5
				},
				requesting: {
					currency: 'nano',
					amount: 0.5
				}
			}

			const sellOpid = await MarketApi.add(user, sellOrder)
			const buyOpid = await MarketApi.add(user, buyOrder)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(1, 'Trade function should have received precisely one match')
			expect(args[0]).to.have.lengthOf(2, 'Trade function was not called with a touple')

			const [maker, taker] = args[0]

			// Testa se as ordens foram enviadas com o valor correto
			expect(maker.id).to.equals(sellOpid.toHexString(), 'First item\'s id mismatch expected maker opid')
			expect(taker.id).to.equals(buyOpid.toHexString(), 'Second item\'s id mismatch expected taker opid')
			expect(maker.owning.currency).to.equals(taker.requesting.currency)
			expect(maker.owning.amount).to.equals(taker.requesting.amount)
			expect(maker.requesting.amount).to.equals(taker.owning.amount)
			expect(maker.requesting.currency).to.equals(taker.owning.currency)
		})
	})

	describe('Testing if taker matchs orders on multiple prices', () => {
		const baseAmount = 1
		const prices = [0.5, 1, 1.5] as const

		it('Should move the price UP', async () => {
			// type sell
			const makers: Parameters<typeof MarketApi['add']>[1][] = prices.map(p => ({
				owning: {
					currency: 'nano',
					amount: baseAmount
				},
				requesting: {
					currency: 'bitcoin',
					amount: baseAmount * p
				}
			}))

			/** Deve ser igual a soma dos requesting da maker menos o último */
			const takerOwningAmount = prices
				.slice(0, prices.length - 1)
				.map(p => baseAmount * p)
				.reduce((acc, cur) => acc + cur)
			const taker: Parameters<typeof MarketApi['add']>[1] = {
				owning: {
					currency: 'bitcoin',
					amount: takerOwningAmount
				},
				requesting: {
					currency: 'nano',
					amount: takerOwningAmount / prices[prices.length - 2]
				}
			}

			const makersOpid = await Promise.all(makers.map(maker => MarketApi.add(user, maker)))
			const takerOpid = await MarketApi.add(user, taker)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(prices.length - 1, `Trade function should have received ${prices.length - 1} matchs`)

			for (let i = 0; i < args.length; i++) {
				expect(args[i]).to.have.lengthOf(2, 'Trade function was not called with a touple')

				// Testa se os opids enviados estão corretos
				const [maker, taker] = args[i]
				expect(maker.id).to.equal(makersOpid[i].toHexString())
				if (i == args.length - 1) expect(taker.id).to.equal(takerOpid.toHexString())
				else expect(taker.id).to.not.equal(takerOpid.toHexString())

				// Testa se as ordens foram enviadas com o valor correto
				expect(maker.owning.currency).to.equals(taker.requesting.currency)
				expect(maker.owning.amount).to.equals(taker.requesting.amount)
				expect(maker.requesting.amount).to.equals(taker.owning.amount)
				expect(maker.requesting.currency).to.equals(taker.owning.currency)
			}

			// Testa se a úlima maker ainda está no livro com status ready
			expect(await Order.findOne({
				_id: makersOpid[makersOpid.length - 1],
				status: 'ready'
			})).to.be.an('object')

			// Testa se existe apenas uma ordem ready no livro
			expect(await Order.find({ status: 'ready' })).to.have.lengthOf(1)
		})

		it('Should move the price DOWN', async () => {
			// type buy
			const makers: Parameters<typeof MarketApi['add']>[1][] = prices.map(p => ({
				owning: {
					currency: 'bitcoin',
					amount: baseAmount * p
				},
				requesting: {
					currency: 'nano',
					amount: baseAmount
				}
			})).reverse() as Parameters<typeof MarketApi['add']>[1][]

			/** Deve ser igual a soma dos requesting da maker menos o último */
			const takerOwningAmount = baseAmount * prices.length - 1
			const taker: Parameters<typeof MarketApi['add']>[1] = {
				owning: {
					currency: 'nano',
					amount: takerOwningAmount
				},
				requesting: {
					currency: 'bitcoin',
					amount: takerOwningAmount / prices[1]
				}
			}

			const makersOpid = await Promise.all(makers.map(maker => MarketApi.add(user, maker)))
			const takerOpid = await MarketApi.add(user, taker)

			sinon.assert.calledOnce(spy)

			const args = spy.getCall(0).args[0]
			expect(args).to.have.lengthOf(prices.length - 1, `Trade function should have received ${prices.length - 1} matchs`)

			for (let i = 0; i < args.length; i++) {
				expect(args[i]).to.have.lengthOf(2, 'Trade function was not called with a touple')

				// Testa se os opids enviados estão corretos
				const [maker, taker] = args[i]
				expect(maker.id).to.equal(makersOpid[i].toHexString())
				if (i == args.length - 1) expect(taker.id).to.equal(takerOpid.toHexString())
				else expect(taker.id).to.not.equal(takerOpid.toHexString())

				// Testa se as ordens foram enviadas com o valor correto
				expect(maker.owning.currency).to.equals(taker.requesting.currency)
				expect(maker.owning.amount).to.equals(taker.requesting.amount)
				expect(maker.requesting.amount).to.equals(taker.owning.amount)
				expect(maker.requesting.currency).to.equals(taker.owning.currency)
			}

			// Testa se a úlima maker ainda está no livro com status ready
			expect(await Order.findOne({
				_id: makersOpid[makersOpid.length - 1],
				status: 'ready'
			})).to.be.an('object')

			// Testa se existe apenas uma ordem ready no livro
			expect(await Order.find({ status: 'ready' })).to.have.lengthOf(1)
		})
	})
})
