import express from 'express'
import request from 'supertest'
import { expect } from 'chai'
import api from '../../src/server/api'

const app = express()
app.use(api)

describe('Testing root of the HTTP API', () => {
	it('Should return a list of supported API versions', async () => {
		const { body } = await request(app).get('/').send()
			.expect('Content-Type', /json/)
			.expect(200)
		expect(body).to.be.an('object').that.deep.equals({
			description: 'HTTP API subdomain',
			entries: ['v1']
		})
	})
})
