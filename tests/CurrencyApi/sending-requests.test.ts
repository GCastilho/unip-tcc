import '../../src/libs/extensions'
import io from 'socket.io-client'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import Person from '../../src/db/models/person'
import Transaction from '../../src/db/models/transaction'
import { currencyNames } from '../../src/libs/currencies'
import * as CurrencyApi from '../../src/currencyApi'
import type { TxSend } from '../../interfaces/transaction'

type SocketCallback = (err: any, response?: string) => void;

describe('Testing if CurrencyApi is making requests to the websocket', () => {
	const port = process.env.CURRENCY_API_PORT || 5808
	let person: InstanceType<typeof Person>

	before(async () => {
		await Person.deleteMany({})

		person = await Person.createOne('sending_request@example.com', 'userP@ss')
		await Transaction.deleteMany({})
	})

	beforeEach(async () => {
		// Manualmente seta o saldo disponível para 10
		for (const currency of currencyNames) {
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.person.currencies[currency].balance.available = 10
		}
		await person.save()
	})

	const url = `http://127.0.0.1:${port}`
	for (const currency of currencyNames) {
		describe(`Once the ${currency} module connects`, () => {
			let client: SocketIOClient.Socket

			before(() => {
				client = io(url + '/' + currency, {
					autoConnect: false
				})
			})

			afterEach(() => {
				client.disconnect()
			})

			it('Should receive a create_new_account request', done => {
				CurrencyApi.createAccount(person.id, currency).catch(err => {
					if (err != 'SocketDisconnected') throw err
				}).then(() => {
					client.connect()

					client.once('create_new_account', (callback: (err: any, account?: string) => void) => {
						callback(null, `account-${currency}`)
						done()
					})
				}).catch(done)
			})

			it('Should receive a withdraw request', done => {
				const amount = 3.456
				CurrencyApi.withdraw(person.id, currency, `${currency}_account`, amount).then(opid => {
					client.connect()

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
						} catch (err) {
							done(err)
						}
						callback(null, 'request received for' + currency)
					})
				}).catch(done)
			})
		})

		describe(`If the ${currency} module is already connected`, () => {
			let client: SocketIOClient.Socket

			before(done => {
				client = io(url + '/' + currency)
				client.once('connect', done)
			})

			after(() => {
				client.disconnect()
			})

			it('Should receive a create_new_account request immediate after requested', done => {
				client.once('create_new_account', (callback: (err: any, account?: string) => void) => {
					callback(null, `account-${currency}`)
					done()
				})

				CurrencyApi.createAccount(person.id, currency).catch(done)
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
					} catch (err) {
						done(err)
					}
					callback(null, 'request received for' + currency)
				})

				CurrencyApi.withdraw(person.id, currency, `${currency}_account`, amount)
					.catch(done)
			})

			it('Shold receive a request for cancell_withdraw immediate after requested', done => {
				const amount = 4
				let _opid: ObjectId

				// Reponse o request para evitar timeout
				client.once('withdraw', (txSent: TxSend, callback: SocketCallback) => {
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
					} catch (err) {
						done(err)
					}
					callback(null, `request received for ${currency}`)
				})

				CurrencyApi.withdraw(person.id, currency, `${currency}_account`, amount).then(opid => {
					_opid = opid
					return CurrencyApi.cancellWithdraw(person.id, currency, opid)
				}).catch(done)
			})
		})
	}
})
