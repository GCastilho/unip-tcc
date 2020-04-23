import { expect } from 'chai'
import { ObjectId, Decimal128 } from 'mongodb'
import Trade from '../../src/db/models/trade'

describe('Testing the trades collection', () => {
	it('Should fail if target and base currency are equal', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'bitcoin'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Currency BASE must be different than currency TARGET')
	})

	it('Shoul fail if maker fee is less than zero', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: -1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Path `maker.fee` (-1) is less than minimum allowed value (0)')
	})

	it('Shoul fail if taker fee is less than zero', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: -1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Path `taker.fee` (-1) is less than minimum allowed value (0)')
	})

	it('Should fail if amount is a negative value', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('-1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('amount: -1 must be a positive number')
	})

	it('Should fail if amount is zero', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('0'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('amount: 0 must be a positive number')
	})

	it('Should fail if price is a negative value', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('-1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('price: -1 must be a positive number')
	})

	it('Should fail if price is zero', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('0'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('price: 0 must be a positive number')
	})

	it('Should fail if total is a negative value', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('-1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('total: -1 must be a positive number')
	})

	it('Should fail if total is zero', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('0'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('total: 0 must be a positive number')
	})

	it('Sould save a document', async () => {
		const doc = new Trade({
			status: 'closed',
			currencies: {
				base: 'bitcoin',
				target: 'nano'
			},
			maker: {
				userId: new ObjectId(),
				fee: 1
			},
			taker: {
				userId: new ObjectId(),
				fee: 1
			},
			type: 'buy',
			amount: Decimal128.fromString('1'),
			price: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.save()).to.eventually.be.fulfilled
	})
})
