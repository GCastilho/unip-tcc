import randomstring from 'randomstring'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import trade from '../../src/marketApi/trade'
import Order from '../../src/db/models/order'
import Person from '../../src/db/models/person'
import TradeDoc from '../../src/db/models/trade'

describe('Testing trade function', () => {
	/** Doc person para a ordem de buy */
	let buyPerson: InstanceType<typeof Person>
	/** Doc person para a ordem de sell */
	let sellPerson: InstanceType<typeof Person>

	/** Uma ordem válida de type buy */
	let buyOrder: InstanceType<typeof Order>
	/** Uma ordem válida de type sell */
	let sellOrder: InstanceType<typeof Order>

	beforeEach(async () => {
		await Person.deleteMany({})
		await Order.deleteMany({})

		// Cria o doc da buyPerson
		buyPerson = new Person({
			email: 'trade-buy-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 32 }),
				password_hash: randomstring.generate({ length: 128 })
			}
		})
		await buyPerson.validate()
		// @ts-expect-error Automaticamente convertido para Decimal128
		buyPerson.currencies.bitcoin.balance.available = 10
		// @ts-expect-error Automaticamente convertido para Decimal128
		buyPerson.currencies.nano.balance.available = 10
		await buyPerson.save()

		// Cria o doc da buyOrder
		buyOrder = await new Order({
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
		sellPerson = new Person(buyPerson.toObject())
		sellPerson.email = 'trade-sell-test@email.com'
		sellPerson._id = new ObjectId()
		sellPerson.isNew = true
		await sellPerson.save()

		// Cria o doc da sellOrder
		sellOrder = new Order(buyOrder.toObject())
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
		// @ts-expect-error Testando um input inválido
		await expect(trade([[buyOrder], [buyOrder, sellOrder]])).to.eventually.be
			.rejectedWith('Orders must allways be in touples')
	})

	it('Should fail if touple does not contains type buy and sell', async () => {
		// Envia duas ordens de types iguais
		await expect(trade([[buyOrder, buyOrder]])).to.eventually.be
			.rejectedWith('Orders must be of type BUY and SELL')
	})

	it('Should fail if ordens don\'t have equal amounts', async () => {
		let sellOrder_copy = new Order(sellOrder.toObject())
		sellOrder_copy.requesting.amount = 1.2
		await expect(trade([[buyOrder, sellOrder_copy]])).to.eventually.be
			.rejectedWith('A maker order must have owning amount equal to taker order\'s requesting amount')

		sellOrder_copy = new Order(sellOrder.toObject())
		sellOrder_copy.owning.amount = 1.2
		await expect(trade([[buyOrder, sellOrder_copy]])).to.eventually.be
			.rejectedWith('A maker order must have requesting amount equal to taker order\'s owning amount')
	})

	it('Should fail if maker\'s owning amount is not locked in pending', async () => {
		// Da lock no saldo da sellPerson usando o opid da sellOrder
		await Person.balanceOps.add(sellPerson._id, sellOrder.owning.currency, {
			amount: sellOrder.owning.amount,
			type: 'trade',
			opid: sellOrder._id
		})

		await expect(trade([[buyOrder, sellOrder]])).to.eventually.be
			.rejectedWith(`Maker order does not have a locked balance for order ${buyOrder.id}`)
	})

	it('Should fail if takers\'s owning amount is not locked in pending', async () => {
		// Cria o usuário e da lock em uma ordem com o opid da buyOrder
		await Person.balanceOps.add(buyPerson._id, buyOrder.owning.currency, {
			amount: buyOrder.owning.amount,
			type: 'trade',
			opid: buyOrder._id
		})

		await expect(trade([[buyOrder, sellOrder]])).to.eventually.be
			.rejectedWith(`Taker order does not have a locked balance for order ${sellOrder.id}`)
	})

	it('Should trade two orders', async () => {
		// Da lock no saldo da buyPerson
		await Person.balanceOps.add(buyPerson._id, buyOrder.owning.currency, {
			amount: buyOrder.owning.amount,
			type: 'trade',
			opid: buyOrder._id
		})

		// Da lock no saldo da sellPerson
		await Person.balanceOps.add(sellPerson._id, sellOrder.owning.currency, {
			amount: sellOrder.owning.amount,
			type: 'trade',
			opid: sellOrder._id
		})

		// Testa se o trade de duas ordens executa sem erros
		await expect(trade([[buyOrder, sellOrder]])).to.eventually.be.fulfilled

		// Testa se as ordens foram removidas do orderbook
		expect(await Order.findById(buyOrder.id), 'buyOrder is still on the orderbook').to.be.null
		expect(await Order.findById(sellOrder.id), 'sellOrder is still on the orderbook').to.be.null

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
			await Person.balanceOps.add(buyPerson._id, buyOrder.owning.currency, {
				amount: - buyOrder.owning.amount,
				type: 'trade',
				opid: buyOrder._id
			})

			// Da lock no saldo da sellPerson
			await Person.balanceOps.add(sellPerson._id, sellOrder.owning.currency, {
				amount: - sellOrder.owning.amount,
				type: 'trade',
				opid: sellOrder._id
			})

			// Testa se o trade de duas ordens executa sem erros
			await expect(trade([[buyOrder, sellOrder]])).to.eventually.be.fulfilled
		})

		it('Should have unlocked buyPerson\'s owning amount', async () => {
			await expect(Person.balanceOps.get(buyOrder.userId, buyOrder.owning.currency, buyOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
		})

		it('Should have subtracted buyPerson\'s owning amount', async () => {
			const person = await Person.findById(buyOrder.userId)
			expect(+person.currencies[buyOrder.owning.currency].balance.available)
				.to.equal(10 - buyOrder.owning.amount) // 10- pq é o saldo inicial
		})

		it('Should have incremented buyPerson\'s requesting amount', async () => {
			const person = await Person.findById(buyOrder.userId)
			await expect(Person.balanceOps.get(buyOrder.userId, buyOrder.requesting.currency, buyOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
			expect(+person.currencies[buyOrder.requesting.currency].balance.available)
				.to.equal(buyOrder.requesting.amount + 10) // +10 pq é o saldo inicial
		})

		it('Should have unlocked sellPerson\'s owning amount', async () => {
			await expect(Person.balanceOps.get(sellOrder.userId, sellOrder.owning.currency, sellOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
		})

		it('Should have subtracted sellPerson\'s owning amount', async () => {
			const person = await Person.findById(sellOrder.userId)
			expect(+person.currencies[sellOrder.owning.currency].balance.available)
				.to.equal(10 - sellOrder.owning.amount) // 10- pq é o saldo inicial
		})

		it('Should have incremented sellPerson\'s requesting amount', async () => {
			const person = await Person.findById(sellOrder.userId)
			await expect(Person.balanceOps.get(sellOrder.userId, sellOrder.requesting.currency, sellOrder._id))
				.to.eventually.be.rejectedWith('OperationNotFound')
			expect(+person.currencies[sellOrder.requesting.currency].balance.available)
				.to.equal(sellOrder.requesting.amount + 10) // +10 pq é o saldo inicial
		})
	})
})
