import request from 'supertest'
import { expect } from 'chai'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../../src/server')

describe('Testing root of the HTTP API', () => {
	it('Should return a list of supported API versions', async () => {
		const { body } = await request(app).get('/').set({ host: 'api.site.com' }).send()
			.expect('Content-Type', /json/)
			.expect(200)
		expect(body).to.be.an('object').that.deep.equals({
			description: 'HTTP API subdomain',
			entries: [ 'v1' ]
		})
	})
})
