import '../../src/libs'
import request from 'supertest'
//import { expect } from 'chai'
import * as UserApi from '../../src/userApi'
import Person from '../../src/db/models/person'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../../src/server')

describe('Testing version 1 of HTTP API', () => {
	const apiConfig = { host: 'api.site.com' }

	before(async () => {
		await Person.deleteMany({})
		await UserApi.createUser('api-v1@email.com', 'UserP@ss')
	})

	it('Should return information about the API', async () => {
		await request(app).get('/v1').set(apiConfig).send()
			.expect('Content-Type', /json/)
			.expect(200, {
				version: 1.0,
				description: 'Entrypoint for the v1 of the HTTP API',
				deprecated: false,
				entries: {
					list: [ 'currencies', 'transaction', 'user' ],
					details: {
						currencies: {
							description: 'Detailed information about the supported currencies of the system',
							endpoint: true,
							auth: false,
							methods: [ 'GET' ]
						},
						transaction: {
							description: 'Informations about a transaction',
							endpoint: false,
							auth: true
						},
						user: {
							description: 'Entrypoint for requests specific to a user',
							endpoint: false,
							auth: true
						}
					}
				}
			})
	})

	it('Should return Bad Request if the request is unrecognized')

	it('Should return Not Found if the path for the request was not found')

	describe('/currencies', () => {
		it('Should return information about the suported currencies')
	})

	describe('/transaction', () => {
		it('Should return information about the subpath')

		describe('/:opid', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('Should return Not Authorized if transaction is from a different user')

			it('Should return informations about the transaction')
		})
	})

	describe('/user', () => {
		it('Should return information about the subpath')

		describe('/info', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('Should return user information')
		})

		describe('/balances', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('should return a balances object from the user')
		})

		describe('/accounts', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('should return a accounts object from the user')
		})

		describe('/withdraw', () => {
			it('Should return Not Authorized if invalid or missing sessionId')

			it('Should return Bad Request if the request is malformed')

			it('Should execute a withdraw for a given currency from the user')
		})
	})
})
