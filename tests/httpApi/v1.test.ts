import '../../src/libs'
import request from 'supertest'
import { expect } from 'chai'
import cookieparser from 'cookieparser'
import * as UserApi from '../../src/userApi'
import * as CurrencyApi from '../../src/currencyApi'
import Person from '../../src/db/models/person'
import Transaction from '../../src/db/models/transaction'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../../src/server')

describe('Testing version 1 of HTTP API', () => {
	const apiConfig = { host: 'api.site.com' }

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

	it('Should return Not Found if the path for the request was not found')

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

		before(async () => {
			await Person.deleteMany({})
			await Transaction.deleteMany({})
			await UserApi.createUser('v1-test@email.com', 'UserP@ss')
			const res = await request(app).post('/login').send({
				email: 'v1-test@email.com',
				password: 'UserP@ss'
			}).expect(200)
			expect(res.header['set-cookie']).not.to.be.undefined
			sessionId = res.header['set-cookie']
				.map(cookieparser.parse)
				.filter(cookie => cookie.sessionId)[0].sessionId
		})

		it('Should return information about the subpath', async () => {
			const { body } = await request(app).get('/v1/currencies').set(apiConfig).send()
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
								returns: 'List of transactions from the user',
								parametres: [
									{
										type: 'query',
										description: '',
										value: 'numeric',
										name: 'from'
									},
									{
										type: 'query',
										description: '',
										value: 'numeric',
										name: 'to'
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
										value: {}
									}
								]
							}
						],
					},
				]
			})
		})

		describe('/info', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/info').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('obejct').that.deep.equals({
					error: 'Not Authorized',
					message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
				})
			})

			it('Should return user information')
		})

		describe('/accounts', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/accounts').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('obejct').that.deep.equals({
					error: 'Not Authorized',
					message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
				})
			})

			it('should return a accounts object from the user')
		})

		describe('/balances', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/balances').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('obejct').that.deep.equals({
					error: 'Not Authorized',
					message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
				})
			})

			it('should return a balances object from the user')
		})

		describe('/transactions', () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				const { body } = await request(app).get('/v1/user/transactions').set(apiConfig).send()
					.expect(401)
				expect(body).to.be.an('obejct').that.deep.equals({
					error: 'Not Authorized',
					message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
				})
			})

			it('Should return a list of transactions of the user')

			describe('/:opid', () => {
				it('Should return Not Authorized if invalid or missing sessionId', async () => {
					const { body } = await request(app).get('/v1/user/transactions/a-opid').set(apiConfig).send()
						.expect(401)
					expect(body).to.be.an('obejct').that.deep.equals({
						error: 'Not Authorized',
						message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
					})
				})

				it('Should return Not Authorized if transaction is from a different user')

				it('Should return informations about the transaction')
			})

			describe('withdraw', () => {
				it('Should return Not Authorized if invalid or missing sessionId', async () => {
					const { body } = await request(app).post('/v1/user/transactions').set(apiConfig).send()
						.expect(401)
					expect(body).to.be.an('obejct').that.deep.equals({
						error: 'Not Authorized',
						message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
					})
					// Checa se a transação foi agendada
					expect(await Transaction.find({})).to.have.lengthOf(0)
				})

				it('Should return Bad Request if the request is malformed')

				it('Should execute a withdraw for a given currency from the user')
			})
		})
	})
})
