import randomstring from 'randomstring'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import PersonDoc, { Person } from '../../src/db/models/person'
import OrderDoc, { Order } from '../../src/db/models/order'
import TradeDoc from '../../src/db/models/trade'
import trade from '../../src/marketApi/trade'
import * as UserApi from '../../src/userApi'

describe('Testing trade function', () => {
	/** Doc person para a ordem de buy */
	let buyPerson: Person
	/** Doc person para a ordem de sell */
	let sellPerson: Person

	/** Uma ordem válida de type buy */
	let buyOrder: Order
	/** Uma ordem válida de type sell */
	let sellOrder: Order

	beforeEach(async () => {
		await PersonDoc.deleteMany({})
		await OrderDoc.deleteMany({})

		// Cria o doc da buyPerson
		buyPerson = new PersonDoc({
			email: 'trade-buy-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 32 }),
				password_hash: randomstring.generate({ length: 128 })
			}
		})
		await buyPerson.validate()
		// @ts-expect-error
		buyPerson.currencies.bitcoin.balance.available = 10
		// @ts-expect-error
		buyPerson.currencies.nano.balance.available = 10
		await buyPerson.save()

		// Cria o doc da buyOrder
		buyOrder = await new OrderDoc({
			userId: buyPerson._id,
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 1
			},
			requesting: {
				currency: 'nano',
				amount: 1
			},
			timestamp: new Date()
		}).save()

		// Cria o doc da sellPerson
		sellPerson = new PersonDoc(buyPerson.toObject())
		sellPerson.email = 'trade-sell-test@email.com'
		sellPerson._id = new ObjectId()
		sellPerson.isNew = true
		await sellPerson.save()

		// Cria o doc da sellOrder
		sellOrder = new OrderDoc(buyOrder.toObject())
		sellOrder._id = new ObjectId()
		sellOrder.isNew = true
		sellOrder.userId = sellPerson._id
		sellOrder.owning.currency = 'nano'
		sellOrder.requesting.currency = 'bitcoin'
		await sellOrder.save()
	})

	it('Should fail if matchs is an empty array', async () => {
		await expect(trade([])).to.eventually.be
			.rejectedWith('Matchs array can\'t be empty')
	})

	it('Should fail if matchs items are not a touple', async () => {
		// @ts-expect-error
		await expect(trade([[buyOrder], [buyOrder, sellOrder]])).to.eventually.be
			.rejectedWith('Orders must allways be in touples')
	})

	it('Should fail if touple does not contains type buy and sell', async () => {
		// Envia duas ordens de types iguais
		await expect(trade([[buyOrder, buyOrder]])).to.eventually.be
			.rejectedWith('Orders must be of type BUY and SELL')
	})

	it('Should fail if ordens don\'t have equal amounts', async () => {
		let sellOrder_copy = new OrderDoc(sellOrder.toObject())
		sellOrder_copy.requesting.amount = 1.2
		await expect(trade([[buyOrder, sellOrder_copy]])).to.eventually.be
			.rejectedWith('A maker order must have owning amount equal to taker order\'s requesting amount')

		sellOrder_copy = new OrderDoc(sellOrder.toObject())
		sellOrder_copy.owning.amount = 1.2
		await expect(trade([[buyOrder, sellOrder_copy]])).to.eventually.be
			.rejectedWith('A maker order must have requesting amount equal to taker order\'s owning amount')
	})

	it('Should fail if maker\'s owning amount is not locked in pending', async () => {
		// Da lock no saldo da sellPerson usando o opid da sellOrder
		const user = await UserApi.findUser.byId(sellPerson._id)
		await user.balanceOps.add(sellOrder.owning.currency, {
			amount: sellOrder.owning.amount,
			type: 'trade',
			opid: sellOrder._id
		})

		await expect(trade([[buyOrder, sellOrder]])).to.eventually.be
			.rejectedWith(`Maker order does not have a locked balance for order ${buyOrder.id}`)
	})

	it('Should fail if takers\'s owning amount is not locked in pending', async () => {
		// Cria o usuário e da lock em uma ordem com o opid da buyOrder
		const user = await UserApi.findUser.byId(buyPerson._id)
		await user.balanceOps.add(buyOrder.owning.currency, {
			amount: buyOrder.owning.amount,
			type: 'trade',
			opid: buyOrder._id
		})

		await expect(trade([[buyOrder, sellOrder]])).to.eventually.be
			.rejectedWith(`Taker order does not have a locked balance for order ${sellOrder.id}`)
	})

	it('Should trade two orders', async () => {
		// Da lock no saldo da buyPerson
		let user = await UserApi.findUser.byId(buyPerson._id)
		await user.balanceOps.add(buyOrder.owning.currency, {
			amount: buyOrder.owning.amount,
			type: 'trade',
			opid: buyOrder._id
		})

		// Da lock no saldo da sellPerson
		user = await UserApi.findUser.byId(sellPerson._id)
		await user.balanceOps.add(sellOrder.owning.currency, {
			amount: sellOrder.owning.amount,
			type: 'trade',
			opid: sellOrder._id
		})

		// Testa se o trade de duas ordens executa sem erros
		await expect(trade([[buyOrder, sellOrder]])).to.eventually.be.fulfilled

		// Testa se as ordens foram removidas do orderbook
		expect(await OrderDoc.findById(buyOrder.id), 'buyOrder is still on the orderbook').to.be.null
		expect(await OrderDoc.findById(sellOrder.id), 'sellOrder is still on the orderbook').to.be.null

		// Testa se um documento de trade com os userIds das ordens foi salvo no db
		expect(
			await TradeDoc.findOne({ 'maker.userId': buyOrder.userId }),
			'No trade document found with maker being the buyOrder\'s userId'
		).to.be.an('object')
		expect(
			await TradeDoc.findOne({ 'taker.userId': sellOrder.userId }),
			'No trade document found with taker being the sellOrder\'s userId'
		).to.be.an('object')

		// Testa se os amounts da tradeDoc batem com o esperado
		const tradeDoc = await TradeDoc.findOne({ 'maker.userId': buyOrder.userId })
		expect(tradeDoc.status).to.equal('closed')

		expect(tradeDoc.maker.userId.toHexString()).to.equal(buyOrder.userId.toHexString())
		expect(tradeDoc.maker.currency).to.equal(buyOrder.requesting.currency)
		expect(tradeDoc.maker.amount).to.equal(buyOrder.requesting.amount - tradeDoc.maker.fee)

		expect(tradeDoc.taker.userId.toHexString()).to.equal(sellOrder.userId.toHexString())
		expect(tradeDoc.taker.currency).to.equal(sellOrder.requesting.currency)
		expect(tradeDoc.taker.amount).to.equal(sellOrder.requesting.amount - tradeDoc.taker.fee)
	})

	describe('Once the trade is successfull', () => {
		beforeEach(async () => {
			await TradeDoc.deleteMany({})

			// Da lock no saldo da buyPerson
			let user = await UserApi.findUser.byId(buyPerson._id)
			await user.balanceOps.add(buyOrder.owning.currency, {
				amount: - buyOrder.owning.amount,
				type: 'trade',
				opid: buyOrder._id
			})

			// Da lock no saldo da sellPerson
			user = await UserApi.findUser.byId(sellPerson._id)
			await user.balanceOps.add(sellOrder.owning.currency, {
				amount: - sellOrder.owning.amount,
				type: 'trade',
				opid: sellOrder._id
			})

			// Testa se o trade de duas ordens executa sem erros
			await expect(trade([[buyOrder, sellOrder]])).to.eventually.be.fulfilled
		})

		it('Should have unlocked buyPerson\'s owning amount', async () => {
			const user = await UserApi.findUser.byId(buyOrder.userId)
			await expect(user.balanceOps.get(buyOrder.owning.currency, buyOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
		})

		it('Should have subtracted buyPerson\'s owning amount', async () => {
			const user = await UserApi.findUser.byId(buyOrder.userId)
			expect(+user.person.currencies[buyOrder.owning.currency].balance.available)
				.to.equal(10 - buyOrder.owning.amount) // 10- pq é o saldo inicial
		})

		it('Should have incremented buyPerson\'s requesting amount', async () => {
			const user = await UserApi.findUser.byId(buyOrder.userId)
			await expect(user.balanceOps.get(buyOrder.requesting.currency, buyOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
			expect(+user.person.currencies[buyOrder.requesting.currency].balance.available)
				.to.equal(buyOrder.requesting.amount + 10) // +10 pq é o saldo inicial
		})

		it('Should have unlocked sellPerson\'s owning amount', async () => {
			const user = await UserApi.findUser.byId(sellOrder.userId)
			await expect(user.balanceOps.get(sellOrder.owning.currency, sellOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
		})

		it('Should have subtracted sellPerson\'s owning amount', async () => {
			const user = await UserApi.findUser.byId(sellOrder.userId)
			expect(+user.person.currencies[sellOrder.owning.currency].balance.available)
				.to.equal(10 - sellOrder.owning.amount) // 10- pq é o saldo inicial
		})

		it('Should have incremented sellPerson\'s requesting amount', async () => {
			const user = await UserApi.findUser.byId(sellOrder.userId)
			await expect(user.balanceOps.get(sellOrder.requesting.currency, sellOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
			expect(+user.person.currencies[sellOrder.requesting.currency].balance.available)
				.to.equal(sellOrder.requesting.amount + 10) // +10 pq é o saldo inicial
		})
	})
})
