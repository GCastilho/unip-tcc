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
			status: 'ready',
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
			status: 'ready',
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
			status: 'ready',
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
			status: 'ready',
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
			status: 'ready',
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
			status: 'ready',
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
			status: 'ready',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		}).save()

		const tx = new Transaction({
			userId: new ObjectId(),
			txid: 'random-txid',
			type: 'send',
			currency: 'bitcoin',
			status: 'ready',
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
			status: 'ready',
			account: 'random-account',
			amount: 1.12345678910,
			timestamp: new Date()
		}).save()

		const jsonRet = tx.toJSON()
		expect(jsonRet.amount).to.be.a('number')
		expect(jsonRet.timestamp).to.be.a('number')
	})

	it('Should save more than one send request without a txid', async () => {
		const transaction = {
			_id: new ObjectId(),
			userId: new ObjectId(),
			currency: 'bitcoin',
			account: 'random-account',
			type: 'send',
			status: 'ready', // Send request não pode ter status pending/confirmed
			amount: '0.1',
			timestamp: new Date(),
		}
		await new Transaction(transaction).save()
		transaction._id = new ObjectId()
		await new Transaction(transaction).save()
	})

	it('Should NOT save a receive transaction without a txid', async () => {
		const transaction = new Transaction({
			userId: new ObjectId(),
			account: 'random-account',
			currency: 'bitcoin',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		})

		await expect(transaction.save()).to.eventually.be
			.rejectedWith('validation failed: txid: Path `txid` is required')
	})

	it('Should fail to save a receive transaction with an existing txid to the same account', async () => {
		const transaction = {
			userId: new ObjectId(),
			account: 'random-account',
			currency: 'bitcoin',
			txid: 'random-txid',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await new Transaction(transaction).save()
		await expect(new Transaction(transaction).save()).to.eventually
			.be.rejectedWith(/^E11000.+index: txid_1/)
	})

	it('Should save a receive transaction with an existing txid to a different account', async () => {
		const transaction = {
			userId: new ObjectId(),
			account: 'random-account',
			currency: 'bitcoin',
			txid: 'random-txid',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await new Transaction(transaction).save()
		transaction.account = 'a-different-account'
		await expect(new Transaction(transaction).save()).to.eventually.be.fulfilled
	})

	it('Should save multiple send transactions with the same txid', async () => {
		const transaction = {
			userId: new ObjectId(),
			account: 'random-account',
			currency: 'bitcoin',
			txid: 'random-txid',
			type: 'send',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await new Transaction(transaction).save()
		await expect(new Transaction(transaction).save()).to.eventually.be.fulfilled
	})
})
