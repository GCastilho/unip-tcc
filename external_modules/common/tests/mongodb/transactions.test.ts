import { ObjectId } from 'mongodb'
import { expect } from 'chai'
import Transaction from '../../db/models/newTransactions'

describe('Testing collection of transactions', () => {
	beforeEach(async () => {
		await Transaction.deleteMany({})
	})

	it('Should save a new transaction', async () => {
		await Transaction.create({
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'send',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		})
	})

	it('Should fail to save a transaction with an existing opid', async () => {
		const transaction = {
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create(transaction)
		transaction.txid = 'a-different-txid'
		await expect(Transaction.create(transaction)).to.eventually
			.be.rejectedWith(/^E11000.+index: opid_1/)
	})

	it('Should save a transaction with the same txid and different type', async () => {
		const txid = 'a-random-txid'
		const transaction = {
			account: 'random-account',
			type: 'send',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create({
			...transaction,
			opid: new ObjectId(),
			type: 'send',
			txid,
		})
		await Transaction.create({
			...transaction,
			opid: new ObjectId(),
			type: 'receive',
			txid,
		})
	})

	it('Should save more than one send transaction without a txid', async () => {
		const transaction = {
			opid: new ObjectId(),
			account: 'random-account',
			type: 'send',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}
		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await Transaction.create(transaction)
	})

	it('Should NOT save a receive transaction without a txid', async () => {
		const transaction = {
			opid: new ObjectId(),
			account: 'random-account',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}
		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await expect(Transaction.create(transaction)).to.eventually
			.be.rejected // Checar a REJECT message
	})

	it('Should fail to save a receive transaction with an existing txid', async () => {
		const transaction = {
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await expect(Transaction.create(transaction)).to.eventually
			.be.rejectedWith(/^E11000.+index: txid_1/)
	})

	it('Should save multiple send transactions with the same txid', async () => {
		const transaction = {
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'send',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await expect(Transaction.create(transaction)).to.eventually.be.fulfilled
	})
})
