import { expect } from 'chai'
import { promisify } from 'util'
import { ObjectId } from 'mongodb'
import sinon, { assert } from 'sinon'
import { Batch } from '../../scheduler'
import Transaction from '../../db/models/transaction'
import { mockedCurrencyApi, WithdrawManyTestCommon } from './setup'
import type { SinonSpy } from 'sinon'
import type { Socket } from 'socket.io'
import type { WithdrawTestCommon } from './setup'
import type { WithdrawRequest } from '../../../../interfaces/transaction'

interface SpyWMany extends WithdrawTestCommon {
	withdrawMany: SinonSpy<
		Parameters<WithdrawTestCommon['withdrawMany']>,
		ReturnType<WithdrawTestCommon['withdrawMany']>
	>
}

before(() => Transaction.deleteMany({}))
const timeout = (ms: number) => new Promise(res => setTimeout(res, ms))

describe('Testing withdrawMany method for Common', () => {
	const currency = 'test-currency'
	let currencyApi: ReturnType<typeof mockedCurrencyApi>
	let common: SpyWMany
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

		common = new WithdrawManyTestCommon({
			name: currency,
			batchOptions: {
				minTransactions: 2,
			}
		}) as unknown as SpyWMany
		common.withdrawMany = sinon.spy(common.withdrawMany)
		common.init().catch(done)
	})

	after(() => {
		currencyApi.close()
		common.close()
	})

	beforeEach(() => Transaction.deleteMany({}))

	afterEach(() => {
		common.withdraw.resetHistory()
		common.withdrawMany.resetHistory()
		updateSentCallback.resetHistory()
	})

	it('Should have withdrawQueue as an instance of Batch', () => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		expect(common.withdrawQueue).to.be.instanceOf(Batch)
	})

	it('Should call the withdrawMany method when receiving multiple transactions', async () => {
		const requests: WithdrawRequest[] = [{
			opid: new ObjectId().toHexString(),
			account: 'random-account-1',
			amount: 10,
		}, {
			opid: new ObjectId().toHexString(),
			account: 'random-account-2',
			amount: 11,
		}]

		await emit('withdraw', requests[0])
		await emit('withdraw', requests[1])

		await timeout(100)

		assert.notCalled(common.withdraw)
		assert.calledOnce(common.withdrawMany)
		assert.calledTwice(updateSentCallback)

		assert.calledWith(common.withdrawMany, {
			[requests[0].account]: +requests[0].amount,
			[requests[1].account]: +requests[1].amount
		})
	})

	it('Should join two requests to the same account', async () => {
		const requests: WithdrawRequest[] = [{
			opid: new ObjectId().toHexString(),
			account: 'same-account-withdraw-many-test',
			amount: 10,
		}, {
			opid: new ObjectId().toHexString(),
			account: 'same-account-withdraw-many-test',
			amount: 11,
		}]

		await emit('withdraw', requests[0])
		await emit('withdraw', requests[1])

		await timeout(50)

		assert.calledOnce(common.withdrawMany)
		assert.calledWith(common.withdrawMany, {
			[requests[0].account]: requests.reduce((acc, cur) => acc + +cur.amount, 0)
		})
	})

	it('Should NOT send a transaction that was cancelled while batching', async () => {
		const requests: WithdrawRequest[] = [{
			opid: new ObjectId().toHexString(),
			account: 'random-account-1',
			amount: 10,
		}, {
			opid: new ObjectId().toHexString(),
			account: 'random-account-2',
			amount: 11,
		}]

		await emit('withdraw', requests[0])
		await emit('cancell_withdraw', requests[0].opid)
		await emit('withdraw', requests[1])

		await timeout(50)

		assert.calledOnce(common.withdraw)
		assert.notCalled(common.withdrawMany)
		assert.calledWith(common.withdraw, {
			account: requests[1].account,
			amount: requests[1].amount
		})
	})
})
