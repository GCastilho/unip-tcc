import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import sinon, { assert } from 'sinon'
import Transaction from '../../db/models/transaction'
import { mockedCurrencyApi, WithdrawTestCommon } from './setup'
import type { Socket } from 'socket.io'
import type { WithdrawRequest } from '../../../../interfaces/transaction'

before(() => Transaction.deleteMany({}))

describe.only('Testing withdraw method for Common', () => {
	const currency = 'test-currency'
	let currencyApi: ReturnType<typeof mockedCurrencyApi>
	let common: WithdrawTestCommon
	let socket: Socket
	const updateSentCallback = sinon.fake((updtSent, callback) => {
		callback(null, `${updtSent.opid} updated`)
	})

	before(done => {
		currencyApi = mockedCurrencyApi(currency)
		currencyApi.of(currency).on('connection', _socket => {
			socket = _socket
			done()
		})

		common = new WithdrawTestCommon({ name: currency })
		common.init().catch(done)
	})

	after(() => currencyApi.close())
	beforeEach(() => Transaction.deleteMany({}))
	afterEach(() => updateSentCallback.resetHistory())

	it('Should call the withdraw method upon receiving the withdraw event', done => {
		socket.once('update_sent_tx', updateSentCallback)

		const request: WithdrawRequest = {
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount: 1,
		}
		socket.emit('withdraw', request, (err, res) => {
			expect(err).to.be.null
			expect(res).to.be.a('string')
			setTimeout(() => {
				assert.calledOnce(common.withdraw)
				assert.calledOnce(updateSentCallback)
				done()
			}, 100)
		})
	})

	it('Should call the withdraw method when receiving multiple transactions', done => {
		socket.on('update_sent_tx', updateSentCallback)

		const requests: WithdrawRequest[] = [1, 2, 3].map(amount => ({
			opid: new ObjectId().toHexString(),
			account: 'random-account',
			amount
		}))

		for (let i = 0; i < requests.length; i++) {
			// Checa apenas no último emit
			if (i == requests.length - 1) {
				socket.emit('withdraw', requests[i], (err, res) => {
					expect(err).to.be.null
					expect(res).to.be.a('string')
					setTimeout(() => {
						assert.calledThrice(common.withdraw)
						assert.calledThrice(updateSentCallback)
						socket.off('update_sent_tx', updateSentCallback)
						done()
					}, 100)
				})
			} else {
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				socket.emit('withdraw', requests[i], () => {})
			}
		}
	})
})
