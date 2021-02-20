import sinon, { assert } from 'sinon'
import { ObjectId } from 'mongodb'
import Transaction, { Send, SendDoc } from '../../db/models/transaction'
import Sync from '../../sync'

describe('Testing Sync\'s class updateSent method', () => {
	const emit = sinon.fake.resolves('tx updated')
	const sync = new Sync(emit)
	let transaction: SendDoc

	beforeEach(async () => {
		await Transaction.deleteMany({})

		transaction = await Send.create({
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'send',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}) as SendDoc

		emit.resetHistory()
	})

	it('Should emit update_sent_tx when receiving a transaction update', async () => {
		await sync.updateSent(transaction)
		assert.calledOnce(emit)
	})

	it('Should set completed flag to true if successfully informing a confirmed transaction', async () => {
		transaction.status = 'confirmed'
		await transaction.save()

		await sync.updateSent(transaction)
		const tx = await Send.findById(transaction.id).orFail() as SendDoc
		tx.completed.should.equal(true)
	})

	it('Should NOT set completed flag to true if informing a pending transaction', async () => {
		await sync.updateSent(transaction)
		const tx = await Send.findById(transaction.id).orFail() as SendDoc
		tx.completed.should.equal(false)
	})
})
