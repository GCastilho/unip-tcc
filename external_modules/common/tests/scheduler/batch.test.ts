import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import { Batch } from '../../scheduler'
import { AssertionError } from 'assert'
import Transaction from '../../db/models/transaction'
import type { WithdrawRequest } from '../../../../interfaces/transaction'

describe('Testing Batch Queue class', () => {
	beforeEach(() => Transaction.deleteMany({}))

	it('Should batch transactions until minTx is achieved', async () => {
		const queue = new Batch({ minTransactions: 3 })
		const asyncIterator = queue[Symbol.asyncIterator]()

		const requests: WithdrawRequest[] = [1, 2, 3].map(v => ({
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: v,
		}))
		requests.forEach(request => queue.push(request))

		const promise = asyncIterator.next()
		await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
			done: false,
			value: new Set(requests.map(request => request.opid))
		})
	})

	it('Should batch transactions untill timeout is achieved', async () => {
		const timeLimit = 200
		const queue = new Batch({ timeLimit })
		const asyncIterator = queue[Symbol.asyncIterator]()

		const request: WithdrawRequest = {
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 1,
		}
		const startTime = Date.now()
		queue.push(request)

		const promise = asyncIterator.next()
		await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
			done: false,
			value: new Set([request.opid])
		})
		expect(Date.now() - startTime > timeLimit)
	})

	it('Should not return transactions already sent in a previous batch', async () => {
		const queue = new Batch({ minTransactions: 3 })
		const asyncIterator = queue[Symbol.asyncIterator]()

		const requests: WithdrawRequest[] = [1, 2, 3].map(v => ({
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: v,
		}))
		requests.forEach(request => queue.push(request))

		// Puxa o primeiro batch
		asyncIterator.next()

		// Envia os próximos requests
		const newestRequests = requests
			.map(request => ({ ...request, opid: new ObjectId().toHexString() }))
		newestRequests.forEach(request => queue.push(request))

		// Puxa o segundo batch
		const promise = asyncIterator.next()

		await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
			done: false,
			value: new Set(newestRequests.map(request => request.opid))
		})
	})

	it('Should fail to insert a transaction in a batch already informed', async () => {
		const queue = new Batch({ minTransactions: 3 })

		const request: WithdrawRequest = {
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 1,
		}
		queue.push(request)

		expect(() => queue.push(request)).to.throw(AssertionError)
	})

	it('Should be able to start the queue after it was stopped', async () => {
		const request: WithdrawRequest = {
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 1,
		}

		const queue = new Batch({})
		queue[Symbol.asyncIterator]() // Inicializa o iterator

		queue.push(request)

		queue.stop()
		queue[Symbol.asyncIterator]() // Inicializa o iterator de novo

		// Dá push na tx para garantir que a memória do opid set foi limpa
		queue.push(request)
	})
})
