import '../../src/libs'
import io from 'socket.io-client'
import { expect } from 'chai'
import { Decimal128 } from 'mongodb'
import Person from '../../src/db/models/person'
import Checklist from '../../src/db/models/checklist'
import Transaction from '../../src/db/models/transaction'
import * as CurrencyApi from '../../src/currencyApi'
import * as UserApi from '../../src/userApi'
import type User from '../../src/userApi/user'
import type { TxSend } from '../../src/db/models/transaction'

describe('Testing if CurrencyApi is making requests to the websocket', () => {
	const port = process.env.CURRENCY_API_PORT || 5808
	let user: User

	before(async () => {
		await Person.deleteMany({})

		user = await UserApi.createUser('sending_request@example.com', 'userP@ss')
		await Checklist.deleteMany({})

		// Manualmente seta o saldo disponível para 10
		for (const currency of CurrencyApi.currencies) {
			user.person.currencies[currency].balance.available = Decimal128.fromNumeric(10)
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
					} catch (err) {
						done(err)
					}
					callback(null, 'request received for' + currency)
				})

				CurrencyApi.withdraw(user, currency, `${currency}_account`, amount)
					.catch(done)
			})
		})
	}
})
