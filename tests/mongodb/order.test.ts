import { expect } from 'chai'
import { ObjectId, Decimal128 } from 'mongodb'
import Order from '../../src/db/models/order'

describe('Testing orders collection', () => {
	it('Should fail if target and base currency are equal', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'bitcoin'
			},
			price: 1,
			amount: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('Currency BASE must be different than currency TARGET')
	})

	it('Should fail if price is a negative value', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: -1,
			amount: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('price: -1.0 must be a positive number')
	})

	it('Should fail if price is zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 0,
			amount: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('price: 0.0 must be a positive number')
	})

	it('Should fail if amount is a negative value', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 1,
			amount: Decimal128.fromString('-1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('amount: -1.0 must be a positive number')
	})

	it('Should fail if amount is zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 1,
			amount: Decimal128.fromString('0'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('amount: 0.0 must be a positive number')
	})

	it('Should fail if total is a negative value', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 1,
			amount: Decimal128.fromString('1'),
			total: Decimal128.fromString('-1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('total: -1.0 must be a positive number')
	})

	it('Should fail if total is zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 1,
			amount: Decimal128.fromString('1'),
			total: Decimal128.fromString('0'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('total: 0.0 must be a positive number')
	})

	it('Should fail if truncated value equals zero', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 1,
			amount: Decimal128.fromString('0.000000001'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.validate()).to.eventually.be
			.rejectedWith('amount: 0E-8 must be a positive number')
	})

	it('Sould save a document', async () => {
		const doc = new Order({
			userId: new ObjectId(),
			status: 'ready',
			type: 'buy',
			currency: {
				base: 'bitcoin',
				target: 'nano'
			},
			price: 1,
			amount: Decimal128.fromString('1'),
			total: Decimal128.fromString('1'),
			timestamp: new Date()
		})
		await expect(doc.save()).to.eventually.be.fulfilled
	})
})
