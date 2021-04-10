import { expect } from 'chai'
import sinon, { assert } from 'sinon'
import { ObjectId } from 'mongodb'
import Transaction, { Receive, ReceiveDoc } from '../../db/models/transaction'
import Sync from '../../sync'
import Account from '../../db/models/account'

describe('Testing Sync\'s class newTransaction method', () => {
	const emit = sinon.fake.resolves(new ObjectId())
	const sync = new Sync(emit)
	let transaction: ReceiveDoc

	beforeEach(async () => {
		await Transaction.deleteMany({})

		transaction = await Receive.create({
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		})

		emit.resetHistory()
	})

	it('Should emit new_transaction when receiving a new transaction', async () => {
		await sync.newTransaction(transaction)
		assert.calledOnce(emit)
	})

	it('Should set completed flag to true if successfully informing a confirmed transaction', async () => {
		transaction.status = 'confirmed'
		await transaction.save()

		await sync.newTransaction(transaction)
		const tx = await Receive.findById(transaction.id).orFail()
		tx.completed.should.equal(true)
	})

	it('Should NOT set completed flag to true if informing a pending transaction', async () => {
		await sync.newTransaction(transaction)
		const tx = await Receive.findById(transaction.id).orFail()
		tx.completed.should.equal(false)
	})

	it('Should delete the account and transactions if received \'UserNotFound\'', async () => {
		const emit = sinon.fake.rejects(Object.assign(new Error(), { code: 'UserNotFound' }))
		const sync = new Sync(emit)
		await Account.create({ account: transaction.account })

		await sync.newTransaction(transaction)
		const tx = await Receive.findById(transaction.id)
		expect(tx).to.be.null

		const account = await Account.findOne({ account: transaction.account })
		expect(account).to.be.null
	})

	it('Should update transaction\'s opid when receiving TransactionExists', async () => {
		const opid = new ObjectId()
		const emit = sinon.fake.rejects(
			Object.assign(new Error(), {
				code: 'TransactionExists',
				transaction: { opid }
			})
		)

		const sync = new Sync(emit)
		await sync.newTransaction(transaction)
		const tx = await Receive.findById(transaction.id).orFail()

		expect(tx.opid).to.deep.equal(opid)
	})
})
