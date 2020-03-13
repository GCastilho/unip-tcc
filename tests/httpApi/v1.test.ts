import '../../src/libs'
import request from 'supertest'
import { expect } from 'chai'
import { ObjectId, Decimal128 } from 'mongodb'
import cookieparser from 'cookieparser'
import * as UserApi from '../../src/userApi'
import * as CurrencyApi from '../../src/currencyApi'
import Person from '../../src/db/models/person'
import Transaction from '../../src/db/models/transaction'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../../src/server')

describe('Testing version 1 of HTTP API', () => {
	const apiConfig = { host: 'api.site.com' }
	const notFoundModel = {
		error: 'NotFound',
		message: 'Endpoint not found'
	}

	before(async () => {
		await Person.deleteMany({})
		await UserApi.createUser('api-v1@email.com', 'UserP@ss')
	})

	it('Should return information about the API', async () => {
		const { body } = await request(app).get('/v1').set(apiConfig).send()
			.expect('Content-Type', /json/)
			.expect(200)
		expect(body).to.be.an('object').that.deep.equals({
			version: 1.0,
			description: 'Entrypoint for the v1 of the HTTP API',
			deprecated: false,
			entries: [
				{
					path: 'currencies',
					description: 'Request informations about the currencies supported by the API',
					request: [{
						method: 'GET',
						returns: 'Detailed information about the supported currencies of the API'
					}],
					auth: false
				},
				{
					path: 'user',
					description: 'Entrypoint for requests specific to a user',
					request: [{
						method: 'GET',
						returns: 'Informations about the entrypoint'
					}],
					auth: false
				}
			]
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
			expect(body).to.be.an('array').that.deep.equals(CurrencyApi.currenciesDetailed)
		})
	})

	describe('/user', () => {
		let sessionId: string
		let id: ObjectId

		const notAuthorizedModel = {
			error: 'NotAuthorized',
			message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
		}

		before(async () => {
			await Person.deleteMany({})
			await Transaction.deleteMany({})
			const user = await UserApi.createUser('v1-test@email.com', 'UserP@ss')
			for (const currency of CurrencyApi.currencies) {
				await Person.findByIdAndUpdate(user.id, {
					$push: {
						[`currencies.${currency}.accounts`]: `${currency}-account`
					},
					$set: {
						[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(55.19764382),
						[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(67.997)
					}
				})
			}
			const res = await request(app).post('/login').send({
				email: 'v1-test@email.com',
				password: 'UserP@ss'
			}).expect(200)
			expect(res.header['set-cookie']).to.be.a('string')
			sessionId = res.header['set-cookie']
				.map(cookieparser.parse)
				.filter(cookie => cookie.sessionId)[0].sessionId
			id = user.id
		})

		it('Should return information about the subpath', async () => {
			const { body } = await request(app).get('/v1/user').set(apiConfig).send()
				.expect('Content-Type', /json/)
				.expect(200)
			expect(body).to.be.an('object').that.deep.equals({
				description: 'Entrypoint for requests specific to a user',
				entries: [
					{
						path: 'info',
						description: 'Request informations about the user',
						auth: true,
						requests: [{
							method: 'GET',
							returns: 'Informations about the user'
						}]
					},
					{
						path: 'accounts',
						description: 'Request a list of accounts of the user',
						auth: true,
						requests: [{
							method: 'GET',
							returns: 'List of accounts of all currencies that the user has',
						}]
					},
					{
						path: 'balances',
						description: 'Request the balances for all the currencies',
						auth: true,
						requests: [{
							method: 'GET',
							returns: 'List of balances of all currencies',
						}]
					},
					{
						path: 'transactions',
						description: 'Fetch, send and update transactions',
						auth: true,
						requests: [
							{
								method: 'GET',
								returns: 'List of transactions from the user in descending order',
								parametres: [
									{
										type: 'query',
										description: 'Filter transactions by currency',
										value: 'string',
										name: 'currency'
									},
									{
										type: 'query',
										description: 'Skip first n results',
										value: 'numeric',
										name: 'skip'
									}
								]
							},
							{
								method: 'GET',
								returns: 'Informations about specific transaction',
								parametres: [
									{
										type: 'path',
										description: 'The opid of the transaction to request data from',
										value: 'string',
										name: 'opid'
									}
								]
							},
							{
								method: 'POST',
								description: 'Submit new transaction',
								returns: 'opid of the submitted transaction',
								parametres: [
									{
										type: 'body',
										description: 'Instructions to execute a withdraw of a currency',
										value: {
											currency: {
												type: 'string',
												description: 'Currency to withdraw from'
											},
											destination: {
												type: 'string',
												description: 'Address to send currency to'
											},
											amount: {
												type: 'numeric',
												description: 'Amount of currency to withdraw'
											}
										}
									}
								]
							}
						],
					},
				]
			})
		})

		it('Should return Not Found if the path for the request was not found', async () => {
			const { body } = await request(app)
				.post('/v1/user/notFoundPath')
				.set(apiConfig)
				.send()
				.expect('Content-Type', /json/)
				.expect(404)
			expect(body).to.be.an('object').that.deep.equal(notFoundModel)
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
					expect(body).to.have.deep.property(currency, user.getAccounts(currency))
				}
			})
		})

		describe('/balances', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/balances').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			})

			it('should return a balances object from the user', async () => {
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
					expect(body).to.have.deep.property(currency, user.getBalance(currency, true))
				}
			})
		})

		describe('/transactions', () => {
			before(async () => {
				const user = await UserApi.findUser.byId(id)
				let txAmount = 0.00000001
				for (let i = 0; i < 30; i++) {
					for (const currency of CurrencyApi.currencies) {
						await CurrencyApi.withdraw(user, currency, `random-account-${currency}`, txAmount)
					}
					txAmount = txAmount * 2
				}
			})

			describe('Testing fetch of multiple transactions', () => {
				it('Should return Not Authorized if invalid or missing sessionId', async () => {
					const { body } = await request(app).get('/v1/user/transactions').set(apiConfig).send()
						.expect(401)
					expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
				})

				it('Should return an empty array if there is no transactions', async () => {
					await UserApi.createUser('empty-tx-user@email.com', 'emptyP@ss')
					const res = await request(app).post('/login').send({
						email: 'v1-test@email.com',
						password: 'UserP@ss'
					}).expect(200)
					expect(res.header['set-cookie']).to.be.a('string')
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
					).slice(10)
					const { body } = await request(app)
						.get('/v1/user/transactions')
						.set('Cookie', [`sessionId=${sessionId}`])
						.set(apiConfig)
						.send()
						.expect(200)
					expect(body).to.be.an('array')
					expect(body.length).to.be.lte(10)
					transactions.forEach(tx_stored => {
						const tx_received = body.find(e => e.opid.toHexString() === tx_stored._id.toHexString())
						expect(Object.entries(tx_received).length).to.equal(8)
						expect(tx_received.status).to.equals(tx_stored.status)
						expect(tx_received.currency).to.equals(tx_stored.currency)
						expect(tx_received.txid).to.equals(tx_stored.txid)
						expect(tx_received.account).to.equals(tx_stored.account)
						expect(tx_received.amount).to.equals(tx_stored.amount.toFullString())
						expect(tx_received.type).to.equals(tx_stored.type)
						expect(tx_received.confirmations).to.equals(tx_stored.confirmations)
						expect(tx_received.timestamp.toString()).to.equals(tx_stored.timestamp.toString())
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
						const tx_received = body.find(e => e.opid.toHexString() === tx_stored._id.toHexString())
						expect(Object.entries(tx_received).length).to.equal(8)
						expect(tx_received.status).to.equals(tx_stored.status)
						expect(tx_received.currency).to.equals(tx_stored.currency)
						expect(tx_received.txid).to.equals(tx_stored.txid)
						expect(tx_received.account).to.equals(tx_stored.account)
						expect(tx_received.amount).to.equals(tx_stored.amount.toFullString())
						expect(tx_received.type).to.equals(tx_stored.type)
						expect(tx_received.confirmations).to.equals(tx_stored.confirmations)
						expect(tx_received.timestamp.toString()).to.equals(tx_stored.timestamp.toString())
					})
				})

				describe('Testing filtering of transactions by currency', () => {
					for (const currency of CurrencyApi.currencies) {
						it(`Should filter transactions by ${currency}`, async () => {
							const transactions = (
								await Transaction.find({ currency }).sort({ timestamp: -1 })
							).slice(10)
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
								const tx_received = body.find(e => e.opid.toHexString() === tx_stored._id.toHexString())
								expect(Object.entries(tx_received).length).to.equal(8)
								expect(tx_received.status).to.equals(tx_stored.status)
								expect(tx_received.currency).to.equals(tx_stored.currency)
								expect(tx_received.txid).to.equals(tx_stored.txid)
								expect(tx_received.account).to.equals(tx_stored.account)
								expect(tx_received.amount).to.equals(tx_stored.amount.toFullString())
								expect(tx_received.type).to.equals(tx_stored.type)
								expect(tx_received.confirmations).to.equals(tx_stored.confirmations)
								expect(tx_received.timestamp.toString()).to.equals(tx_stored.timestamp.toString())
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
							error: 'Not Authorized',
							message: 'This transaction does not belong to your account'
						})
					}
				})

				it('Should return informations about a transaction', async () => {
					const transactions = await Transaction.find({})
					// Testa pelo recebimento individual de todas as transações
					for (const tx of transactions) {
						const { body } = await request(app)
							.get(`/v1/user/transactions/${tx._id.toHexString()}`)
							.set('Cookie', [`sessionId=${sessionId}`])
							.set(apiConfig)
							.send()
							.expect('Content-Type', /json/)
							.expect(200)
						expect(body).to.be.an('object').that.deep.equals({
							status:        tx.status,
							currency:      tx.currency,
							txid:          tx.txid,
							account:       tx.account,
							amount:       +tx.amount.toFullString(),
							type:          tx.type,
							confirmations: tx.confirmations,
							timestamp:     tx.timestamp
						})
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
						const { available } = user.getBalance(currency, true)
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
						expect(tx.amount.toFullString()).to.equal('2.0')
					})
				})
			}
		})
	})
})
