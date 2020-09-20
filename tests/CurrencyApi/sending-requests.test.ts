import '../../src/libs/extensions'
import io from 'socket.io-client'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Person from '../../src/db/models/person'
import Checklist from '../../src/db/models/checklist'
import Transaction from '../../src/db/models/transaction'
import * as CurrencyApi from '../../src/currencyApi'
import * as UserApi from '../../src/userApi'
import type User from '../../src/userApi/user'
import type { TxSend } from '../../interfaces/transaction'

describe('Testing if CurrencyApi is making requests to the websocket', () => {
	const port = process.env.CURRENCY_API_PORT || 5808
	let user: User

	before(async () => {
		await Person.deleteMany({})

		user = await UserApi.createUser('sending_request@example.com', 'userP@ss')
		await Checklist.deleteMany({})
	})

	beforeEach(async () => {
		// Manualmente seta o saldo disponível para 10
		for (const currency of CurrencyApi.currencies) {
			// @ts-expect-error
			user.person.currencies[currency].balance.available = 10
		}
		await user.person.save()
	})

	const url = `http://127.0.0.1:${port}`
	for (const currency of CurrencyApi.currencies) {
		describe(`Once the ${currency} module connects`, () => {
			let client: SocketIOClient.Socket

			afterEach(() => {
				client.disconnect()
			})

			it('Should receive a create_new_account request', done => {
				CurrencyApi.create_accounts(user.id, [currency]).then(() => {
					client = io(url + '/' + currency)

					client.once('create_new_account', (callback: (err: any, account?: string) => void) => {
						callback(null, `account-${currency}`)
						done()
					})
				}).catch(done)
			})

			it('Should receive a withdraw request', done => {
				const amount = 3.456
				CurrencyApi.withdraw(user, currency, `${currency}_account`, amount).then(opid => {
					client = io(url + '/' + currency)

					client.once('withdraw', async (
						request: TxSend,
						callback: (err: any, response?: string) => void
					) => {
						try {
							expect(request).to.be.an('object')

							expect(request.opid).to.be.a('string')
								.that.equals(opid.toHexString())

							const tx = await Transaction.findById(opid)

							expect(request.account).to.be.a('string')
								.that.equals(tx.account)

							expect(request.amount).to.be.a('string')
								.that.equals(tx.amount.toFullString())

							done()
						} catch(err) {
							done(err)
						}
						callback(null, 'request received for' + currency)
					})
				}).catch(done)
			})

			it('Should receive a cancell_withdraw request', done => {
				const amount = 3.456
				let _opid: string

				CurrencyApi.withdraw(user, currency, `${currency}_account`, amount).then(opid => {
					_opid = opid.toHexString()
					return CurrencyApi.cancellWithdraw(user.id, currency, opid)
				}).then(response => {
					expect(response).to.be.a('string').that.equals('requested')
					return Checklist.findOne({
						opid: _opid,
						command: 'cancell_withdraw',
					})
				}).then(check => {
					expect(check).to.be.a('object')
					expect(check.opid.toHexString()).to.equals(_opid)

					client = io(url + '/' + currency)

					// Responde o evento de withdraw para evitar timeout
					client.once('withdraw', (
						request: TxSend,
						callback: (err: any, response?: string) => void
					) => {
						callback(null, 'request received for' + currency)
					})

					client.once('cancell_withdraw', async (
						opid: string,
						callback: (err: any, response?: string) => void
					) => {
						try {
							const tx = await Transaction.findById(_opid)

							expect(tx).to.be.an('object')
							expect(opid).to.be.a('string')
								.that.equals(tx._id.toHexString())

							done()
						} catch(err) {
							done(err)
						}
						callback(null, `request received for ${currency}`)
					})
				}).catch(done)
			})
		})

		describe(`If the ${currency} module is already connected`, () => {
			let client: SocketIOClient.Socket

			before(async () => {
				client = io(url + '/' + currency)
			})

			after(() => {
				client.disconnect()
			})

			it('Should receive a create_new_account request immediate after requested', done => {
				client.once('create_new_account', (callback: (err: any, account?: string) => void) => {
					callback(null, `account-${currency}`)
					done()
				})

				CurrencyApi.create_accounts(user.id, [currency]).catch(done)
			})

			it('Should receive a withdraw request immediate after requested', done => {
				const amount = 4.567
				client.once('withdraw', async (
					request: TxSend,
					callback: (err: any, response?: string) => void
				) => {
					try {
						expect(request).to.be.an('object')
						expect(request.opid).to.be.a('string')

						const tx = await Transaction.findById(request.opid)
						expect(tx).to.be.an('object')

						expect(request.account).to.be.a('string')
							.that.equals(tx.account)

						expect(request.amount).to.be.a('string')
							.that.equals(tx.amount.toFullString())

						done()
					} catch(err) {
						done(err)
					}
					callback(null, 'request received for' + currency)
				})

				CurrencyApi.withdraw(user, currency, `${currency}_account`, amount)
					.catch(done)
			})

			it('Shold receive a request for cancell_withdraw immediate after requested', done => {
				const amount = 4
				let _opid: ObjectId
				client.once('cancell_withdraw', async (
					opid: string,
					callback: (err: any, response?: string) => void
				) => {
					try {
						const tx = await Transaction.findById(_opid)

						expect(tx).to.be.an('object')

						expect(opid).to.be.a('string')
							.that.equals(tx._id.toHexString())
						done()
					} catch(err) {
						done(err)
					}
					callback(null, `request received for ${currency}`)
				})

				CurrencyApi.withdraw(user, currency, `${currency}_account`, amount).then(opid => {
					_opid = opid
					return CurrencyApi.cancellWithdraw(user.id, currency, opid)
				}).catch(done)
			})
		})
	}
})
