import express from 'express'
import request from 'supertest'
import { expect } from 'chai'
import api from '../../../src/server/api'
import { currencies } from '../../../src/libs/currencies'

const app = express()
app.use(api)

describe('Performing basic tests on the version 1 of HTTP API', () => {
	it('Should return information about the API', async () => {
		const { body } = await request(app).get('/v1').send()
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
			.send()
			.expect('Content-Type', /json/)
			.expect(404)

		expect(body).to.be.an('object').that.deep.equal({
			error: 'NotFound',
			message: 'Endpoint not found'
		})
	})

	describe('/currencies', () => {
		it('Should return information about the suported currencies', async () => {
			const { body } = await request(app).get('/v1/currencies').send()
				.expect('Content-Type', /json/)
				.expect(200)
			const currenciesDetailed = currencies.map(currency => ({
				name: currency.name,
				code: currency.code,
				decimals: currency.decimals,
				fee: currency.fee
			}))
			expect(body).to.be.an('array').that.deep.equals(currenciesDetailed)
		})
	})
})
