import request from 'supertest'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../../src/server')

describe('Testing root of the HTTP API', () => {
	it('Should return a list of supported API versions', async () => {
		await request(app).get('/').set({ host: 'api.site.com' }).send()
			.expect('Content-Type', /json/)
			.expect(200, {
				description: 'HTTP API subdomain',
				versions: [ 1 ]
			})
	})
})
