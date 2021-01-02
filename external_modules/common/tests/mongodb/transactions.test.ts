import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Transaction, { Receive, Send } from '../../db/models/newTransactions'

describe('Testing transactions collection', () => {
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
			type: 'receive' as const,
			status: 'pending' as const,
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
			status: 'pending' as const,
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

	it('Should save more than one send request without a txid', async () => {
		const transaction = {
			opid: new ObjectId(),
			account: 'random-account',
			type: 'send' as const,
			status: 'requested' as const,
			amount: '0.1',
		}
		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await Transaction.create(transaction)
	})

	it('Should NOT save a receive transaction without a txid', async () => {
		// @ts-expect-error Testando erro ao salvar sem txid
		await expect(Transaction.create({
			opid: new ObjectId(),
			account: 'random-account',
			type: 'receive',
			status: 'pending',
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		})).to.eventually.be
			.rejectedWith('validation failed: txid: Path `txid` is required')
	})

	it('Should fail to save a receive transaction with an existing txid to the same account', async () => {
		const transaction = {
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'receive' as const,
			status: 'pending' as const,
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await expect(Transaction.create(transaction)).to.eventually
			.be.rejectedWith(/^E11000.+index: txid_1/)
	})

	it('Should save a receive transaction with an existing txid to a different account', async () => {
		const transaction = {
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'receive' as const,
			status: 'pending' as const,
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		transaction.account = 'a-different-account'
		await expect(Transaction.create(transaction)).to.eventually.be.fulfilled
	})

	it('Should save multiple send transactions with the same txid', async () => {
		const transaction = {
			opid: new ObjectId(),
			txid: 'random-txid',
			account: 'random-account',
			type: 'send' as const,
			status: 'pending' as const,
			amount: '0.1',
			confirmations: 1,
			timestamp: Date.now(),
		}

		await Transaction.create(transaction)
		transaction.opid = new ObjectId()
		await expect(Transaction.create(transaction)).to.eventually.be.fulfilled
	})

	it('Should save a withdraw request', async () => {
		await Transaction.create({
			opid: new ObjectId(),
			account: 'random-account',
			type: 'send',
			status: 'requested',
			amount: '0.1',
		})
	})

	it('Should fail to save a send request with extra properties', async () => {
		await expect(Transaction.create({
			opid: new ObjectId(),
			// @ts-expect-error Testando propriedades extra no create
			txid: 'random-txid',
			account: 'random-account',
			type: 'send',
			status: 'requested',
			amount: '0.1',
			completed: true,
			confirmations: 1,
			timestamp: Date.now(),
		})).to.eventually.be.rejectedWith(/can not have a txid.+can not be completed/)
	})

	describe('Testing discriminators', () => {
		it('Should save a new receive transaction', async () => {
			await Receive.create({
				txid: 'random-txid',
				account: 'random-account',
				type: 'receive',
				status: 'pending',
				amount: '0.1',
				confirmations: 1,
				timestamp: Date.now(),
			})
		})

		it('Should create a send transaction', async () => {
			await Send.create({
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

		it('Should create a send request', async () => {
			await Send.create({
				opid: new ObjectId(),
				account: 'random-account',
				type: 'send',
				status: 'requested',
				amount: '0.1',
			})
		})

		it('Should create a send request using createOne', async () => {
			await Send.createRequest({
				opid: new ObjectId(),
				account: 'random-account',
				amount: '0.1',
			})
		})
	})
})
