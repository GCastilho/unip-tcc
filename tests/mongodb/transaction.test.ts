import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Transaction from '../../src/db/models/transaction'

describe('Testing transactions collection', () => {
	beforeEach(async () => {
		await Transaction.deleteMany({})
	})

	it('Should save a transaction', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		})
		await expect(tx.save()).to.eventually.be.fulfilled
	})

	it('Should fail if the currency is invalid', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'obamas',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		})
		await expect(tx.validate()).to.eventually.be
			.rejectedWith('currency: `obamas` is not a valid enum value for path `currency`')
	})

	it('Should fail to save a transaction with ZERO amount', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 0,
			timestamp: new Date()
		})
		await expect(tx.save()).to.eventually.be
			.rejectedWith('0 must be a positive number')
	})

	it('Should fail to save a transaction with negative amount', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: -1,
			timestamp: new Date()
		})
		await expect(tx.save()).to.eventually.be
			.rejectedWith('-1 must be a positive number')
	})

	it('Should truncate the amount after the supported for that currency', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		})
		await tx.validate()
		expect(tx.amount.toString()).to.equals('1.12345678')
	})

	it('Should fail if truncated value equals zero', async () => {
		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: '0.000000001', // Presume máximo de 8 casas decimais
			timestamp: new Date()
		})
		await expect(tx.validate()).to.eventually.be
			.rejectedWith('amount: 0 must be a positive number')
	})

	it('Should save a recevie and send transaction with the same txid', async () => {
		await new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		}).save()

		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'send',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		})
		await expect(tx.save()).to.eventually.be.fulfilled
	})

	it('Should fail to save a transaction with invalid account')

	it('Should return amount and time as number when calling toJSON', async () => {
		const tx = await new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'receive',
			currency: 'bitcoin',
			status: 'processing',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		}).save()

		const jsonRet = tx.toJSON()
		expect(jsonRet.amount).to.be.a('number')
		expect(jsonRet.timestamp).to.be.a('number')
	})
})
