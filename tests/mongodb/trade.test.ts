import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Trade from '../../src/db/models/trade'

describe('Testing the trades collection', () => {
	it('Should fail if maker and taker currency are the same', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 1,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 1,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Currency MAKER must be different than currency TAKER')
	})

	it('Shoul fail if maker fee is less than zero', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 1,
				fee: -1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: 1,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Path `maker.fee` (-1) is less than minimum allowed value (0)')
	})

	it('Shoul fail if taker fee is less than zero', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 1,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: 1,
				fee: -1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Path `taker.fee` (-1) is less than minimum allowed value (0)')
	})

	it('Should fail if maker amount is a negative value', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: -1,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: 1,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('maker.amount: -1 must be a positive number')
	})

	it('Should fail if maker amount is zero', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 0,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: 1,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('maker.amount: 0 must be a positive number')
	})

	it('Should fail if taker amount is a negative value', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 1,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: -1,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('taker.amount: -1 must be a positive number')
	})

	it('Should fail if taker amount is zero', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 1,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: 0,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('taker.amount: 0 must be a positive number')
	})

	it('Sould save a document', async () => {
		const doc = new Trade({
			status: 'closed',
			maker: {
				userId: new ObjectId(),
				currency: 'bitcoin',
				amount: 3,
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				currency: 'nano',
				amount: 6,
				fee: 1
			},
			timestamp: new Date()
		})
		await expect(doc.save()).to.eventually.be.fulfilled
		expect(doc.price).to.equal(0.5)
	})

	describe('When using \'byUser\' to get documents from the collection', () => {
		const makerId = new ObjectId()
		const takerId = new ObjectId()
		const amounts = [0.5, 2]

		before(async () => {
			const docs = amounts.map(a => new Trade({
				status: 'closed',
				maker: {
					userId: makerId,
					currency: 'bitcoin',
					amount: 1,
					fee: 1
				},
				taker: {
					userId: takerId,
					currency: 'nano',
					amount: a,
					fee: 2
				},
				timestamp: new Date()
			}))
			await Trade.insertMany(docs)

			// Um doc de uma ordem não relacionada
			await Trade.create({
				status: 'closed',
				maker: {
					userId: new ObjectId(),
					currency: 'bitcoin',
					amount: 1,
					fee: 1
				},
				taker: {
					userId: new ObjectId(),
					currency: 'nano',
					amount: 2,
					fee: 2
				},
				timestamp: new Date()
			})
		})

		it('Should return the correct transformed documents for maker user', async () => {
			const docs = await Trade.find({}).byUser(makerId)
			expect(docs).to.have.lengthOf(amounts.length)
			for (let i = 0; i < amounts.length; i++) {
				const doc = docs[i]
				expect(doc.amount).to.equal(amounts[i])
				expect(doc.total).to.equal(1)
				expect(doc.price).to.equal(1 / amounts[i]) // Segue a ordem de maker/taker do doc
				expect(doc.fee).to.equal(1)
			}
		})

		it('Should return the correct transformed documents for taker user', async () => {
			const docs = await Trade.find({}).byUser(takerId)
			expect(docs).to.have.lengthOf(amounts.length)
			for (let i = 0; i < amounts.length; i++) {
				const doc = docs[i]
				expect(doc.amount).to.equal(amounts[i])
				expect(doc.total).to.equal(1)
				expect(doc.price).to.equal(1 / amounts[i]) // Segue a ordem de maker/taker do doc
				expect(doc.fee).to.equal(2)
			}
		})
	})
})
