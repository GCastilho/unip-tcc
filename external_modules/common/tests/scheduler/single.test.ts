import { ObjectId } from 'mongodb'
import { assert, expect } from 'chai'
import { Single } from '../../scheduler'
import Transaction, { Send } from '../../db/models/transaction'
import type { WithdrawRequest } from '../../../../interfaces/transaction'

describe('Testing Single Queue class', () => {
	beforeEach(() => Transaction.deleteMany({}))

	it('Should iterate the value immediately after pushed', async () => {
		const queue = new Single()
		const asyncIterator = queue[Symbol.asyncIterator]()
		const promise = asyncIterator.next()
		assert.instanceOf(promise, Promise)

		const request: WithdrawRequest = {
			opid: 'random-opid',
			account: 'random-account',
			amount: 1,
		}
		queue.push(request)

		await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
			done: false,
			value: request
		})
	})

	it('Should cache items if not iterating', async () => {
		const queue = new Single()
		const asyncIterator = queue[Symbol.asyncIterator]()
		const requests: WithdrawRequest[] = [1, 2, 3].map(v => ({
			opid: 'random-opid',
			account: 'random-account',
			amount: v,
		}))
		requests.forEach(request => queue.push(request))

		for (const request of requests) {
			const promise = asyncIterator.next()
			await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
				done: false,
				value: request
			})
		}
	})

	it('Should clear cached values if stop is called', async () => {
		const queue = new Single()
		const asyncIterator = queue[Symbol.asyncIterator]()
		const requests: WithdrawRequest[] = [1, 2, 3].map(v => ({
			opid: 'random-opid',
			account: 'random-account',
			amount: v,
		}))
		requests.forEach(request => queue.push(request))

		queue.stop()

		const promise = asyncIterator.next()
		await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
			done: true,
			value: undefined
		})
	})

	it('Should bootstrap items from the database', async () => {
		const requests: WithdrawRequest[] = [1, 2, 3].map(v => ({
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: v,
		}))

		// Adiciona 2 tx aleatórias para garantir que elas não serão utilizadas no bootstrap
		await Promise.all(
			['send', 'receive'].map(type => ({
				opid: new ObjectId(),
				txid: 'random-txid',
				account: 'random-account',
				type,
				status: 'pending',
				amount: '0.1',
				confirmations: 1,
				timestamp: Date.now(),
				// @ts-expect-error TS dá erro ao executar método em um union type
			})).map(tx => new Transaction(tx).save())
		)

		// Adiciona um request ao DB por vez, para poder checar a ordem de inserção
		for (const request of requests) {
			await Send.createRequest(request)
		}

		const queue = new Single()
		const asyncIterator = queue[Symbol.asyncIterator]()

		for (const request of requests) {
			const promise = asyncIterator.next()
			await expect(promise).to.eventually.be.fulfilled.and.deep.equals({
				done: false,
				value: request
			})
		}
	})
})
