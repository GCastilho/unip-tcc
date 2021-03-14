import { expect } from 'chai'
import { promisify } from 'util'
import { ObjectId } from 'mongodb'
import sinon, { assert } from 'sinon'
import Transaction from '../../db/models/transaction'
import { mockedCurrencyApi, WithdrawTestCommon } from './setup'
import type { Socket } from 'socket.io'
import type { WithdrawRequest } from '../../../../interfaces/transaction'

before(() => Transaction.deleteMany({}))
const timeout = (ms: number) => new Promise(res => setTimeout(res, ms))

describe('Testing withdraw method for Common', () => {
	const currency = 'test-currency'
	let currencyApi: ReturnType<typeof mockedCurrencyApi>
	let common: WithdrawTestCommon
	let socket: Socket
	let emit: (event: string, arg: any) => Promise<unknown>

	const updateSentCallback = sinon.fake((updtSent, callback) => {
		callback(null, `${updtSent.opid} updated`)
	})

	before(done => {
		currencyApi = mockedCurrencyApi(currency)
		currencyApi.of(currency).on('connection', _socket => {
			socket = _socket
			socket.on('update_sent_tx', updateSentCallback)
			emit = promisify((event: string, req, callback) => socket.emit(event, req, callback))
			done()
		})

		common = new WithdrawTestCommon({ name: currency })
		common.init().catch(done)
	})

	after(() => {
		currencyApi.close()
		common.close()
	})

	beforeEach(() => Transaction.deleteMany({}))

	afterEach(() => {
		common.withdraw.resetHistory()
		updateSentCallback.resetHistory()
	})

	it('Should call the withdraw method upon receiving the withdraw event', async () => {
		const request: WithdrawRequest = {
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 1,
		}

		await emit('withdraw', request)
		await timeout(100)
		assert.calledOnce(common.withdraw)
		assert.calledOnce(updateSentCallback)
	})

	it('Should call the withdraw method when receiving multiple transactions', async () => {
		const requests: WithdrawRequest[] = [2, 3, 4].map(amount => ({
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount
		}))

		for (const request of requests) {
			await emit('withdraw', request)
		}
		await timeout(100)
		assert.calledThrice(common.withdraw)
		assert.calledThrice(updateSentCallback)
	})

	function createSpy() {
		let resolveRun: () => void
		const withdrawCalled = new Promise(res => {
			resolveRun = res
		})

		let resolveFake: (value?: unknown) => void
		const withdrawFake = sinon.fake(() => {
			return new Promise(res => {
				resolveRun()
				resolveFake = res
			})
		})

		const resolveWithdraw = function() {
			resolveFake({
				txid: `random-txid-${Math.random()}`,
				status: 'pending',
				confirmations: 2,
				timestamp: Date.now(),
			})
		}

		return [withdrawFake, withdrawCalled, resolveWithdraw] as const
	}

	it('Should sent transactions that were cancelled right AFTER they\'re picked', async () => {
		const request: WithdrawRequest = {
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 10,
		}
		const originalWithdrawSpy = common.withdraw

		const [withdrawSpy, withdrawCalled, resolveWithdraw] = createSpy()
		common.withdraw = withdrawSpy

		await emit('withdraw', request)
		await withdrawCalled

		const cancell = expect(
			emit('cancell_withdraw', request.opid)
		).to.eventually.be
			.rejected.with.an('object')
			.that.has.property('code').that.equals('AlreadyExecuted')
		await timeout(50)
		resolveWithdraw()
		await cancell

		await timeout(50)
		assert.calledOnce(common.withdraw)
		assert.calledOnce(updateSentCallback)

		common.withdraw = originalWithdrawSpy
	})

	it('Should NOT sent transctions that were cancelled right BEFORE they\'re picked', async () => {
		const requests: WithdrawRequest[] = [{
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 10,
		}, {
			opid: new ObjectId().toHexString(),
			account: 'random-account2',
			amount: 10 + 1,
		}]

		const originalWithdrawSpy = common.withdraw

		const [withdrawSpy, withdrawCalled, resolveWithdraw] = createSpy()
		common.withdraw = withdrawSpy

		await emit('withdraw', requests[0])
		await withdrawCalled
		await emit('withdraw', requests[1])

		await emit('cancell_withdraw', requests[1].opid)
		resolveWithdraw()

		// Checa se foi chamado só com o primeiro request
		await timeout(50)
		assert.calledOnce(common.withdraw)
		assert.calledOnce(updateSentCallback)

		common.withdraw = originalWithdrawSpy
	})
})
