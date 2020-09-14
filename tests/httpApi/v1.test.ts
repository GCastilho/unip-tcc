import '../../src/libs'
import request from 'supertest'
import { expect } from 'chai'
import { ObjectId, Decimal128 } from 'mongodb'
import cookieparser from 'cookieparser'
import * as UserApi from '../../src/userApi'
import * as CurrencyApi from '../../src/currencyApi'
import Person from '../../src/db/models/person'
import Session from '../../src/db/models/session'
import Checklist from '../../src/db/models/checklist'
import Transaction from '../../src/db/models/transaction'
import app from '../../src/server/api'

describe('Testing version 1 of HTTP API', () => {
	const apiConfig = { host: 'api.site.com' }
	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}
	const notFoundModel = {
		error: 'NotFound',
		message: 'Endpoint not found'
	}
	let id: ObjectId

	before(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})
		await Transaction.deleteMany({})
		const newUser = await UserApi.createUser(user.email, user.password)
		id = newUser.id
	})

	it('Should return information about the API', async () => {
		const { body } = await request(app).get('/v1').set(apiConfig).send()
			.expect('Content-Type', /json/)
			.expect(200)
		expect(body).to.be.an('object').that.deep.equals({
			version: 1.0,
			description: 'Entrypoint for the v1 of the HTTP API',
			deprecated: false
		})
	})

	it('Should return Bad Request if the request is unrecognized')

	it('Should return Not Found if the path for the request was not found', async () => {
		const { body } = await request(app)
			.post('/v1/notFoundPath')
			.set(apiConfig)
			.send()
			.expect('Content-Type', /json/)
			.expect(404)
		expect(body).to.be.an('object').that.deep.equal(notFoundModel)
	})

	describe('/currencies', () => {
		it('Should return information about the suported currencies', async () => {
			const { body } = await request(app).get('/v1/currencies').set(apiConfig).send()
				.expect('Content-Type', /json/)
				.expect(200)
			const currenciesDetailed = CurrencyApi.currencies.map(currency => ({
				name: currency,
				...CurrencyApi.detailsOf(currency)
			}))
			expect(body).to.be.an('array').that.deep.equals(currenciesDetailed)
		})
	})

	describe('/user', () => {
		let sessionId: string

		const notAuthorizedModel = {
			error: 'NotAuthorized',
			message: 'A valid cookie \'sessionId\' is required to perform this operation'
		}

		before(async () => {
			for (const currency of CurrencyApi.currencies) {
				await Person.findByIdAndUpdate(id, {
					$push: {
						[`currencies.${currency}.accounts`]: `${currency}-account`
					},
					$set: {
						[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(55.19764382),
						[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(67.997)
					}
				})
			}
		})

		beforeEach(async () => {
			const res = await request(app)
				.post('/v1/user/authentication')
				.set(apiConfig)
				.send(user)
				.expect(200)
			expect(res.header['set-cookie']).to.be.an('array')
			sessionId = res.header['set-cookie']
				.map(cookieparser.parse)
				.filter(cookie => cookie.sessionId)[0].sessionId
		})

		it('Should return information about the subpath', async () => {
			const { body } = await request(app).get('/v1/user').set(apiConfig).send()
				.expect('Content-Type', /json/)
				.set('Cookie', [`sessionId=${sessionId}`])
				.expect(200)
			expect(body).to.be.an('object').that.deep.equals({
				description: 'Entrypoint for requests specific to a user'
			})
		})

		it('Should return Not Found if the path for the request was not found', async () => {
			const { body } = await request(app)
				.post('/v1/user/notFoundPath')
				.set('Cookie', [`sessionId=${sessionId}`])
				.set(apiConfig)
				.send()
				.expect('Content-Type', /json/)
				.expect(404)
			expect(body).to.be.an('object').that.deep.equal(notFoundModel)
		})

		describe('When making a register request', () => {
			const user = {
				email: 'register-test@email.com',
				password: 'UserP@ss'
			}

			it('Should fail if sending empty object', async () => {
				await request(app)
					.post('/v1/user')
					.set(apiConfig)
					.send({})
					.expect(400)
			})

			it('Should fail if email is null', async () => {
				const usersBefore = await Person.estimatedDocumentCount()
				await request(app)
					.post('/v1/user')
					.set(apiConfig)
					.send({ password: 'null_email' })
					.expect(400)
				const usersAfter = await Person.estimatedDocumentCount()
				expect(usersBefore).to.equal(usersAfter)
			})

			it('Should fail if password is null', async () => {
				await request(app)
					.post('/v1/user')
					.set(apiConfig)
					.send({ email: 'null_pass@example.com' })
					.expect(400)

				// Assert user was NOT created
				expect(await Person.findOne({ email: 'null_pass@example.com' })).to.be.null
			})

			it('Should fail if email and password are null', async () => {
				await request(app)
					.post('/v1/user')
					.set(apiConfig)
					.send({ email: '', password: '' })
					.expect(400)
			})

			it('Should signup new users', async () => {
				await request(app)
					.post('/v1/user')
					.set(apiConfig)
					.send(user)
					.expect(201)

				// Assert user was created
				const person = await Person.findOne({ email: user.email })
				expect(person).to.not.be.null

				// Assertions about the data saved in the database
				expect(person.credentials.salt).to.be.a('string')
				expect(person.credentials.password_hash).to.not.be.equal(user.password)
				expect(person.credentials.password_hash.length).to.be.gte(128)
			})

			it('Should fail if user already exists', async () => {
				await request(app)
					.post('/v1/user')
					.set(apiConfig)
					.send(user)
					.expect(409)

				// Assert user was NOT created
				expect(await Person.find({ email: user.email })).lengthOf(1)
			})

			it('Should have a create_account request for each currency', async () => {
				const createAccountRequests = await Checklist.find({
					userId: id,
					command: 'create_account'
				})
				expect(createAccountRequests).to.lengthOf(CurrencyApi.currencies.length)

				CurrencyApi.currencies.forEach(currency => {
					expect(
						createAccountRequests.some(item => item.currency === currency),
						`not found request for ${currency}`
					).to.be.true
				})
			})
		})

		describe('/authentication', () => {
			it('Should authenticate an existing users', async () => {
				const res = await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send(user)
					.expect(200)
				expect(res.header['set-cookie']).not.to.be.undefined

				const cookies: any[] = res.header['set-cookie']
					.map(cookieparser.parse)
					.filter(cookie => cookie.sessionId)
				expect(cookies.length).to.equal(1)

				const { _id } = await Person.findOne({ email: user.email })
				const cookie = await Session.findOne({ userId: _id })
				expect(cookies[0].sessionId).to.be.equal(cookie.sessionId)
			})

			it('Should deauthenticate an existing user', async () => {
				const res = await request(app)
					.delete('/v1/user/authentication')
					.set('Cookie', [`sessionId=${sessionId}`])
					.set(apiConfig)
					.send()
					.expect(200)
				const cookie: string = res.header['set-cookie'][0]
				expect(cookie).to.includes('sessionId=')
				expect(cookie).to.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
			})

			it('Should fail if sending empty object', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({})
					.expect(400)
			})

			it('Should fail if email is null', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({ password: 'null_email' })
					.expect(400)
					.expect(res => {
						expect(res.header['set-cookie']).to.be.undefined
						expect(res.body)
							.to.be.an('object')
							.to.haveOwnProperty('error')
					})
			})

			it('Should fail if password is null', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({ email: 'null_password@example.com' })
					.expect(400)
					.expect(res => {
						expect(res.header['set-cookie']).to.be.undefined
						expect(res.body)
							.to.be.an('object')
							.to.haveOwnProperty('error')
					})
			})

			it('Should fail if email and password are null', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({ email: '', password: '' })
					.expect(400)
					.expect(res => {
						expect(res.header['set-cookie']).to.be.undefined
						expect(res.body)
							.to.be.an('object')
							.to.haveOwnProperty('error')
					})
			})

			it('Should fail if non-existent user', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({
						email: 'undefined@example.com',
						password: 'undefined_pass'
					})
					.expect(401)
					.expect(res => {
						expect(res.header['set-cookie']).to.be.undefined
						expect(res.body)
							.to.be.an('object')
							.to.haveOwnProperty('error')
					})
			})

			it('Should fail if user with wrong password', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({
						email: user.email,
						password: 'not_user.password'
					})
					.expect(401)
					.expect(res => {
						expect(res.header['set-cookie']).to.be.undefined
						expect(res.body)
							.to.be.an('object')
							.to.haveOwnProperty('error')
					})
			})

			it('Should fail if valid password but wrong user', async () => {
				await request(app)
					.post('/v1/user/authentication')
					.set(apiConfig)
					.send({
						email: 'undefined@example.com',
						password: user.password
					}).expect(401)
					.expect(res => {
						expect(res.header['set-cookie']).to.be.undefined
						expect(res.body)
							.to.be.an('object')
							.to.haveOwnProperty('error')
					})
			})
		})

		describe('/info', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/info').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			})

			it('Should return user information')
		})

		describe('/accounts', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/accounts').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			})

			it('should return a accounts object from the user', async () => {
				const user = await UserApi.findUser.byId(id)
				const { body } = await request(app)
					.get('/v1/user/accounts')
					.set('Cookie', [`sessionId=${sessionId}`])
					.set(apiConfig)
					.send()
					.expect(200)
				expect(body).to.be.an('object')
				for (const key in body) {
					expect(key).to.be.oneOf(CurrencyApi.currencies)
				}
				for (const currency of CurrencyApi.currencies) {
					expect(body).to.have.deep.property(currency, await user.getAccounts(currency))
				}
			})
		})

		describe('/balances', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/balances').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			})

			it('Should return a balances object from the user', async () => {
				const user = await UserApi.findUser.byId(id)
				const { body } = await request(app)
					.get('/v1/user/balances')
					.set('Cookie', [`sessionId=${sessionId}`])
					.set(apiConfig)
					.send()
					.expect(200)
				expect(body).to.be.an('object')
				for (const key in body) {
					expect(key).to.be.oneOf(CurrencyApi.currencies)
				}
				for (const currency of CurrencyApi.currencies) {
					expect(body).to.have.deep.property(currency, await user.getBalance(currency, true))
				}
			})
		})

		describe('/transactions', () => {
			before(async () => {
				const user = await UserApi.findUser.byId(id)

				// Calcula os amount das operações
				const amounts: [CurrencyApi.SuportedCurrencies, number][] = []
				const amountsSum = new Map<CurrencyApi.SuportedCurrencies, number>()
				for (let i = 1; i <= 30; i++) {
					for (const currency of CurrencyApi.currencies) {
						const txAmount = CurrencyApi.detailsOf(currency).fee * 2 * Math.pow(i, Math.E)
						amounts.push([currency, txAmount])

						const sum = amountsSum.get(currency) | 0
						amountsSum.set(currency, sum + txAmount)
					}
				}

				// Garante saldo disponível para todas as operações
				for (const currency of CurrencyApi.currencies) {
					const { available } = user.person.currencies[currency].balance
					const updatedAmount = +available + amountsSum.get(currency)
					await Person.findByIdAndUpdate(user.id, {
						$set: {
							[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(updatedAmount)
						}
					})
				}

				// Executa as operações de saque
				for (const [currency, amount] of amounts) {
					await CurrencyApi.withdraw(user, currency, `random-account-${currency}`, amount)
				}

				// Adiciona um txid e confirmations nas transações
				const txs = await Transaction.find({})
				for (const tx of txs) {
					tx.txid = `txid-${tx.currency}-${tx.amount}`
					tx.confirmations = Math.trunc(+tx.amount.toFullString())
				}
				await Promise.all(txs.map(tx => tx.save()))
			})

			describe('Testing fetch of multiple transactions', () => {
				it('Should return Not Authorized if invalid or missing sessionId', async () => {
					const { body } = await request(app).get('/v1/user/transactions').set(apiConfig).send()
						.expect(401)
					expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
				})

				it('Should return an empty array if there is no transactions', async () => {
					await UserApi.createUser('empty-tx-user@email.com', 'emptyP@ss')
					const res = await request(app)
						.post('/v1/user/authentication')
						.set(apiConfig)
						.send({
							email: 'empty-tx-user@email.com',
							password: 'emptyP@ss'
						}).expect(200)
					expect(res.header['set-cookie']).to.be.an('array')
					const _sessionId = res.header['set-cookie']
						.map(cookieparser.parse)
						.filter(cookie => cookie.sessionId)[0].sessionId
					const { body } = await request(app)
						.get('/v1/user/transactions')
						.set('Cookie', [`sessionId=${_sessionId}`])
						.set(apiConfig)
						.send()
						.expect(200)
					expect(body).to.be.an('array').that.have.lengthOf(0)
				})

				it('Should return a list of the last 10 transactions of the user', async () => {
					const transactions = (
						await Transaction.find({}).sort({ timestamp: -1 })
					).slice(0, 10)
					const { body } = await request(app)
						.get('/v1/user/transactions')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.send()
						.expect(200)
					expect(body).to.be.an('array')
					expect(body.length).to.be.lte(10)
					transactions.forEach(tx_stored => {
						const tx_received = body.find(e => e.opid === tx_stored.id)
						expect(tx_received).to.be.an('object', `Transaction with opid ${tx_stored._id} not sent`)
						expect(Object.entries(tx_received).length).to.equal(9)
						expect(tx_received.opid).to.equals(tx_stored._id.toHexString())
						expect(tx_received.status).to.equals(tx_stored.status)
						expect(tx_received.currency).to.equals(tx_stored.currency)
						expect(tx_received.txid).to.equals(tx_stored.txid)
						expect(tx_received.account).to.equals(tx_stored.account)
						expect(tx_received.amount).to.equals(tx_stored.amount.toFullString())
						expect(tx_received.type).to.equals(tx_stored.type)
						expect(tx_received.confirmations).to.equals(tx_stored.confirmations)
						expect(tx_received.timestamp).to.equals(tx_stored.timestamp.getTime())
					})
				})

				it('Should skip first 10 transactions', async () => {
					const transactions = (
						await Transaction.find().sort({ timestamp: -1 })
					).slice(10, 20)
					const { body } = await request(app)
						.get('/v1/user/transactions')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.query({ skip: 10 })
						.send()
						.expect(200)
					expect(body).to.be.an('array')
					expect(body.length).to.be.lte(10)
					transactions.forEach(tx_stored => {
						const tx_received = body.find(e => e.opid === tx_stored._id.toHexString())
						expect(tx_received).to.be.an('object', `Transaction with opid ${tx_stored._id} not sent`)
						expect(Object.entries(tx_received).length).to.equal(9)
						expect(tx_received.opid).to.equals(tx_stored._id.toHexString())
						expect(tx_received.status).to.equals(tx_stored.status)
						expect(tx_received.currency).to.equals(tx_stored.currency)
						expect(tx_received.txid).to.equals(tx_stored.txid)
						expect(tx_received.account).to.equals(tx_stored.account)
						expect(tx_received.amount).to.equals(tx_stored.amount.toFullString())
						expect(tx_received.type).to.equals(tx_stored.type)
						expect(tx_received.confirmations).to.equals(tx_stored.confirmations)
						expect(tx_received.timestamp).to.equals(tx_stored.timestamp.getTime())
					})
				})

				describe('Testing filtering of transactions by currency', () => {
					for (const currency of CurrencyApi.currencies) {
						it(`Should filter transactions by ${currency}`, async () => {
							const transactions = (
								await Transaction.find({ currency }).sort({ timestamp: -1 })
							).slice(0, 10)
							const { body } = await request(app)
								.get('/v1/user/transactions')
								.set('Cookie', [`sessionId=${sessionId}`])
								.set(apiConfig)
								.query({ currency })
								.send()
								.expect(200)
							expect(body).to.be.an('array')
							expect(body.length).to.be.lte(10)
							transactions.forEach(tx_stored => {
								const tx_received = body.find(e => e.opid === tx_stored._id.toHexString())
								expect(tx_received).to.be.an('object', `Transaction with opid ${tx_stored._id} not sent`)
								expect(Object.entries(tx_received).length).to.equal(9)
								expect(tx_received.opid).to.equals(tx_stored._id.toHexString())
								expect(tx_received.status).to.equals(tx_stored.status)
								expect(tx_received.currency).to.equals(tx_stored.currency)
								expect(tx_received.txid).to.equals(tx_stored.txid)
								expect(tx_received.account).to.equals(tx_stored.account)
								expect(tx_received.amount).to.equals(tx_stored.amount.toFullString())
								expect(tx_received.type).to.equals(tx_stored.type)
								expect(tx_received.confirmations).to.equals(tx_stored.confirmations)
								expect(tx_received.timestamp).to.equals(tx_stored.timestamp.getTime())
							})
						})
					}
				})
			})

			describe('Testing fetch of specific transaction', () => {
				it('Should return Not Authorized if invalid or missing sessionId', async () => {
					const { body } = await request(app).get('/v1/user/transactions/a-opid').set(apiConfig).send()
						.expect(401)
					expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
				})

				it('Should return Not Authorized if transaction is from a different user', async () => {
					/** Set do opid das transações do outro usuário */
					const opidSet = new Set<ObjectId>()

					// Cria o outro usuário
					const user = await UserApi.createUser('randomUser-v1-test@email.com', 'randomPass')
					for (const currency of CurrencyApi.currencies) {
						user.person.currencies[currency].balance.available = Decimal128.fromNumeric(50)
						await user.person.save()
						const opid = await CurrencyApi.withdraw(user, currency, `other-account-${currency}`, 12.5)
						opidSet.add(opid)
					}

					// Tenta requisitar info das txs do outro usuário
					for (const opid of opidSet) {
						const { body } = await request(app)
							.get(`/v1/user/transactions/${opid.toHexString()}`)
							.set('Cookie', [`sessionId=${sessionId}`])
							.set(apiConfig)
							.send()
							.expect(401)
						expect(body).to.be.an('object').that.deep.equals({
							error: 'NotAuthorized',
							message: 'This transaction does not belong to your account'
						})
					}
				})

				it('Should return informations about a transaction', async () => {
					const transactions = await Transaction.find({ user: id })
					// Testa pelo recebimento individual de todas as transações
					for (const tx of transactions) {
						const { body } = await request(app)
							.get(`/v1/user/transactions/${tx._id.toHexString()}`)
							.set('Cookie', [`sessionId=${sessionId}`])
							.set(apiConfig)
							.send()
							.expect('Content-Type', /json/)
							.expect(200)

						expect(body).to.be.an('object')
						expect(Object.entries(body).length).to.be.within(7, 9)
						expect(body.opid).to.equals(tx._id.toHexString())
						expect(body.status).to.equals(tx.status)
						expect(body.currency).to.equals(tx.currency)
						expect(body.txid).to.equals(tx.txid)
						expect(body.account).to.equals(tx.account)
						expect(body.amount).to.equals(tx.amount.toFullString())
						expect(body.type).to.equals(tx.type)
						expect(body.confirmations).to.equals(tx.confirmations)
						expect(body.timestamp).to.equals(tx.timestamp.getTime())
					}
				})
			})

			for (const currency of CurrencyApi.currencies) {
				describe(`Testing withdraw requests for ${currency}`, () => {
					it('Should return Not Authorized if invalid or missing sessionId', async () => {
						/** Número de transações antes da operação */
						const txSavedBefore = (await Transaction.find({})).length
						const { body } = await request(app)
							.post('/v1/user/transactions')
							.set(apiConfig)
							.send({
								currency,
								destination: `account-destination-${currency}`,
								amount: 1
							})
							.expect(401)
						expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
						// Checa se a transação foi agendada
						expect(await Transaction.find({})).to.have.lengthOf(txSavedBefore)
					})

					it('Should return Bad Request if the request is malformed')

					it('Should return NotEnoughFunds if amount is greater than the available balance', async () => {
						const user = await UserApi.findUser.byId(id)
						const { available } = await user.getBalance(currency, true)
						const { body } = await request(app)
							.post('/v1/user/transactions')
							.set('Cookie', [`sessionId=${sessionId}`])
							.set(apiConfig)
							.send({
								currency,
								destination: `account-destination-${currency}`,
								amount: +available + 10
							})
							.expect('Content-Type', /json/)
							.expect(403)
						expect(body).to.be.an('object').that.deep.equals({
							error: 'NotEnoughFunds',
							message: 'There are not enough funds on your account to perform this operation'
						})
					})

					it('Should execute a withdraw for a given currency from the user', async () => {
						const { body } = await request(app)
							.post('/v1/user/transactions')
							.set('Cookie', [`sessionId=${sessionId}`])
							.set(apiConfig)
							.send({
								currency,
								destination: `account-destination-${currency}`,
								amount: 2
							})
							.expect('Content-Type', /json/)
							.expect(200)
						expect(body).to.be.an('object')
						expect(body.opid).to.be.a('string')
						// Checa de uma transação com esse opid existe
						const tx = await Transaction.findById(body.opid)
						expect(tx).to.be.an('object')
						expect(tx.currency).to.equals(currency)
						expect(tx.account).to.equal(`account-destination-${currency}`)
						expect(tx.amount.toFullString()).to.equal((2 - tx.fee).toString())
					})
				})
			}
		})

		describe('Testing requests to update user data', () => {
			before(async () => {
				await Person.findByIdAndUpdate(id, {
					'currencies': {}
				})
			})

			describe('When updating user password', () => {
				it('Should fail if sending an empty object', async () => {
					const { body } = await request(app)
						.patch('/v1/user/password')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.send({})
						.expect(400)

					expect(body).to.deep.equal({
						error: 'BadRequest',
						message: 'This request must contain a object with an \'old\' and \'new\' properties'
					})
				})

				it('Should fail if not sending old_password', async () => {
					const { body } = await request(app)
						.patch('/v1/user/password')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.send({ new: 'aNewPassword' })
						.expect(400)

					expect(body).to.deep.equal({
						error: 'BadRequest',
						message: 'This request must contain a object with an \'old\' and \'new\' properties'
					})
				})

				it('Should fail if not sending new_password', async () => {
					const { body } = await request(app)
						.patch('/v1/user/password')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.send({ oldPassword: user.password })
						.expect(400)

					expect(body).to.deep.equal({
						error: 'BadRequest',
						message: 'This request must contain a object with an \'old\' and \'new\' properties'
					})
				})

				it('Should fail if not authenticated', async () => {
					const { body } = await request(app)
						.patch('/v1/user/password')
						.set(apiConfig)
						.send({
							old: user.password,
							new: 'aNewPassword'
						})
						.expect(401)

					expect(body).to.deep.equal(notAuthorizedModel)
				})

				it('Should update the password from a user', async () => {
					const { body } = await request(app)
						.patch('/v1/user/password')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.send({
							old: user.password,
							new: 'aNewPassword'
						})
						.expect(200)

					expect(body).to.deep.equal({
						message: 'Password updated'
					})

					const updatedUser = await UserApi.findUser.byCookie(sessionId)
					await expect(updatedUser.checkPassword('aNewPassword')).to.eventually.be.fulfilled
				})
			})
		})
	})
})
