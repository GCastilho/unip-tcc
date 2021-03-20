import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import sinon, { assert } from 'sinon'
import Transaction, { Receive, ReceiveDoc } from '../../db/models/transaction'
import Sync from '../../sync'

describe('Testing Sync\'s class updateReceived method', () => {
	const emit = sinon.fake.resolves('tx updated')
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

	it('Should emit update_received_tx when receiving a transaction update', async () => {
		await sync.updateReceived(transaction)
		assert.calledOnce(emit)
	})

	it('Should set completed flag to true if successfully informing a confirmed transaction', async () => {
		transaction.status = 'confirmed'
		await transaction.save()

		await sync.updateReceived(transaction)
		const tx = await Receive.findById(transaction.id).orFail()
		tx.completed.should.equal(true)
	})

	it('Should NOT set completed flag to true if informing a pending transaction', async () => {
		await sync.updateReceived(transaction)
		const tx = await Receive.findById(transaction.id).orFail()
		tx.completed.should.equal(false)
	})

	it('Should set completed flag to true if received an TransactionConfirmed error', async () => {
		const emit = sinon.fake.rejects(Object.assign(new Error(), { code: 'TransactionConfirmed' }))
		const sync = new Sync(emit)

		await sync.updateReceived(transaction)
		const tx = await Receive.findById(transaction.id).orFail()
		tx.completed.should.be.true
	})

	it('Should update a specific transaction from a batch', async () => {
		// Modifica a tx existente para ela ser pega primeiro no fndOne
		transaction.status = 'confirmed'
		await transaction.save()

		// Cria uma outra transação
		const otherTx = await Receive.create({
			opid: new ObjectId(),
			txid: transaction.txid, // Mesma txid
			account: `${transaction.account}-another`, // different account
			type: 'receive',
			status: 'pending',
			amount: '0.12',
			confirmations: 1,
			timestamp: Date.now(),
		})

		expect(Transaction.find()).to.eventually.be
			.fulfilled.with.an('object')
			.that.have.property('length').that.equals(2)

		await sync.updateReceived(otherTx)

		const completedTxs = await Transaction.find({ completed: true })
		completedTxs.length.should.equal(1)
	})
})