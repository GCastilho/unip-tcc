import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Order from '../../src/db/models/order'

describe('Testing orders collection', () => {
	it('Should fail if target and base currency are equal', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 1
			},
			requesting: {
				currency: 'bitcoin',
				amount: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('OWNING currency must be different than REQUESTING currency')
	})

	it('Should fail if the currencies are invalid', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'dilmas',
				amount: 1
			},
			requesting: {
				currency: 'obamas',
				amount: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('owning.currency: `dilmas` is not a valid enum value for path `owning.currency`., requesting.currency: `obamas` is not a valid enum value for path `requesting.currency`')
	})

	it('Should fail if owning amount is a negative value', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: -1
			},
			requesting: {
				currency: 'nano',
				amount: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('owning.amount: -1 must be a positive number')
	})

	it('Should fail if owning amount is zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 0
			},
			requesting: {
				currency: 'nano',
				amount: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('owning.amount: 0 must be a positive number')
	})

	it('Should fail if requesting amount is a negative value', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 1
			},
			requesting: {
				currency: 'nano',
				amount: -1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('requesting.amount: -1 must be a positive number')
	})

	it('Should fail if requesting amount is zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 1
			},
			requesting: {
				currency: 'nano',
				amount: 0
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('requesting.amount: 0 must be a positive number')
	})

	it('Should fail if truncated value equals zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: '0.000000001', // Presume máximo de 8 casas decimais
			},
			requesting: {
				currency: 'nano',
				amount: 1
			},
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('owning.amount: 0 must be a positive number')
	})

	it('Sould save a document', async () => {
		const doc = new Order({
			userId: new ObjectId(),
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
		})
		await expect(doc.save()).to.eventually.be.fulfilled
	})

	it('Should truncate the price with the decimals of the base', async () => {
		// Doc tem amounts que causam dízima no preço
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 0.1
			},
			requesting: {
				currency: 'nano',
				amount: 0.3
			},
			timestamp: new Date()
		})
		await expect(doc.save()).to.eventually.be.fulfilled
		expect(doc.price.toString().split('.')[1]).to.have.lengthOf(8)
	})

	it('Should NOT have a rounding error while calculating the price', async () => {
		// Doc tem amounts que causam roudng errors em float
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			owning: {
				currency: 'bitcoin',
				amount: 2.675
			},
			requesting: {
				currency: 'nano',
				amount: 0.001
			},
			timestamp: new Date()
		})
		await expect(doc.save()).to.eventually.be.fulfilled
		expect(doc.price).to.equal(2675)
	})

	describe('When splitting an order', () => {
		let orderPrice: number
		let doc: InstanceType<typeof Order>

		beforeEach(async () => {
			doc = await new Order({
				userId: new ObjectId(),
				status: 'ready',
				owning: {
					currency: 'bitcoin',
					amount: 4
				},
				requesting: {
					currency: 'nano',
					amount: 8
				},
				timestamp: new Date()
			}).save()
			orderPrice = doc.price
		})

		it('Should NOT change the price from the original or the copy', () => {
			const splittedDoc = doc.split(1, 2)
			expect(orderPrice).to.equal(splittedDoc.price)
			expect(orderPrice).to.equal(doc.price)
		})

		it('Should split an order only informing the amount', () => {
			const splittedDoc = doc.split(1)
			expect(orderPrice).to.equal(splittedDoc.price)
			expect(orderPrice).to.equal(doc.price)
			expect(splittedDoc.requesting.amount).to.equal(2)
		})

		it('Should set originalOrderId when creating a copy', () => {
			const splittedDoc = doc.split(1)
			expect(splittedDoc.originalOrderId).to.deep.equal(doc._id)
		})

		it('Should set originalOrderId when creating a copy of a copy', () => {
			const splittedDoc = doc.split(3)
			const splittedDoc2 = splittedDoc.split(1)
			expect(splittedDoc2.originalOrderId).to.deep.equal(doc._id)
		})

		it('Should fail to split an order if the amounts result in a different price', () => {
			expect(() => doc.split(1, 1)).to.throw('Split can not change the order\'s price')
		})

		it('Should fail if owning is equal that the original amount', () => {
			expect(() => doc.split(4))
				.to.throw('Split amounts can not be greater nor equal than original\'s amount')
		})

		it('Should fail if owning is greater that the original amount', () => {
			expect(() => doc.split(10))
				.to.throw('Split amounts can not be greater nor equal than original\'s amount')
		})
	})
})
