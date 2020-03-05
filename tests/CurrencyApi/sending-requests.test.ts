import '../../src/libs'
import io from 'socket.io-client'
import { expect } from 'chai'
import { Decimal128 } from 'mongodb'
import Person from '../../src/db/models/person'
import Checklist from '../../src/db/models/checklist'
import * as CurrencyApi from '../../src/currencyApi'
import * as UserApi from '../../src/userApi'
import type User from '../../src/userApi/user'
import type { TxSend } from '../../src/db/models/transaction'

describe('Testing if CurrencyApi is making requests to the websocket', () => {
	let user: User

	before(async () => {
		await Person.deleteMany({})
		await Checklist.deleteMany({})

		user = await UserApi.createUser('sending_request@example.com', 'userP@ss')

		// Manualmente seta o saldo disponível para 10
		for (const currency of CurrencyApi.currencies) {
			user.person.currencies[currency].balance.available = Decimal128.fromNumeric(10)
		}
		await user.person.save()
	})

	afterEach(done => {
		// Garante que a CurrencyApi terminou de processar o request
		setTimeout(done, 50)
	})

	const url = `http://127.0.0.1:${process.env.CURRENCY_API_PORT}`
	describe('Once the socket connects', () => {
		for (const currency of CurrencyApi.currencies) {
			describe(currency, () => {
				let client: SocketIOClient.Socket

				before(async () => {
					await Checklist.deleteMany({})
				})

				afterEach(() => {
					client.disconnect()
				})

				it('Sould receive a create_account request', done => {
					CurrencyApi.create_accounts(user.id, [currency]).then(() => {
						client = io(url + '/' + currency)

						client.once('create_new_account', (callback: (err: any, account?: string) => void) => {
							callback(null, `account-${currency}`)
							done()
						})
					})
				})

				it('Should receive a withdraw request', done => {
					CurrencyApi.withdraw(user, currency, `${currency}_account`, 3.456).then(opid => {
						client = io(url + '/' + currency)

						client.once('withdraw', (request: TxSend, callback: (err: any, response?: string) => void) => {
							expect(request).to.be.an('object')

							expect(request).to.haveOwnProperty('opid')
								.that.is.a('string').and.equals(opid.toHexString())

							expect(request).to.haveOwnProperty('account')
								.that.is.a('string').and.equals(`${currency}_account`)

							expect(request).to.haveOwnProperty('amount')
								.that.is.a('string').and.equals('3.456')

							callback(null, 'request received for' + currency)
							done()
						})
					})
				})
			})
		}
	})

	describe('If the socket is connected', () => {
		for (const currency of CurrencyApi.currencies) {
			describe(currency, () => {
				let client: SocketIOClient.Socket

				before(async () => {
					await Checklist.deleteMany({})
					client = io(url + '/' + currency)
				})

				after(() => {
					client.disconnect()
				})

				it('Should receive a create_account request immediate after requested', done => {
					client.once('create_new_account', (callback: (err: any, account?: string) => void) => {
						callback(null, `account-${currency}`)
						done()
					})

					CurrencyApi.create_accounts(user.id, [currency]).catch(err => {
						done(err)
					})
				})

				it('Should receive a withdraw request immediate after requested', done => {
					client.once('withdraw', (request: TxSend, callback: (err: any, response?: string) => void) => {
						expect(request).to.be.an('object')

						/**
						 * Não dá pra testar o opid porque tem chance de o
						 * listener de withdraw ser colocado depois do evento
						 * ser emitido
						 */
						expect(request).to.haveOwnProperty('opid')
							.that.is.a('string')//.and.equals(opid.toHexString())

						expect(request).to.haveOwnProperty('account')
							.that.is.a('string').and.equals(`${currency}_account`)

						expect(request).to.haveOwnProperty('amount')
							.that.is.a('string').and.equals('4.567')

						callback(null, 'request received for' + currency)
						done()
					})

					CurrencyApi.withdraw(user, currency, `${currency}_account`, 4.567)
						.catch(err => done(err))
				})
			})
		}
	})
})
