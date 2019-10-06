const request = require('supertest')
const cookieparser = require('cookieparser')
const { user } = require('../fixtures/db')
const app = require('../../src/server')
const Cookie = require('../../src/db/models/cookie')

module.exports = function login_test() {
	describe('User login (/login)', () => {
		test('Should fail if sending empty object', async () => {
			await request(app).post('/login').send({}).expect(400)
		})

		test('Should fail if email is null', async () => {
			const user = { password: 'somePassword' }
			await request(app).post('/login').send(user)
				.expect(400)
				.expect((res) =>
					expect(res.headers['set-cookie']).toBe(undefined)
				)
		})

		test('Should fail if password is null', async () => {
			const user = { email: 'user1@example.com' }
			await request(app).post('/login').send(user)
				.expect(400)
				.expect(res =>
					expect(res.headers['set-cookie']).toBe(undefined)
				)
		})

		test('Should fail if email and password are null', async () => {
			await request(app).post('/login').send({
				email: '',
				password: ''
			}).expect(400)
			.expect(res => expect(res.headers['set-cookie']).toBe(undefined))
		})

		test('Should fail if non-existent user', async () => {
			await request(app).post('/login').send({
				email: 'undefined@example.com',
				password: 'undefined'
			}).expect(401)
			.expect(res => expect(res.headers['set-cookie']).toBe(undefined))
		})

		test('Should fail if user with wrong password', async () => {
			await request(app).post('/login').send({
				email: 'user@example.com',
				password: 'null'
			}).expect(401)
			.expect(res => expect(res.headers['set-cookie']).toBe(undefined))
		})

		test('Should fail if valid password but wrong user', async () => {
			await request(app).post('/login').send({
				email: 'undefined@example.com',
				password: user.password
			}).expect(401)
			.expect(res => expect(res.headers['set-cookie']).toBe(undefined))
		})

		test('Should login existing users', async () => {
			const res = await request(app).post('/login').send(user)
				.expect(303)
			expect(res.headers['set-cookie']).not.toBe(undefined)

			const cookies = res.headers['set-cookie']
				.map(cookieparser.parse)
				.filter(cookie => cookie.sessionID)
			expect(cookies.length).toEqual(1)

			const cookie = await Cookie.findOne({ email: user.email })
			expect(cookies[0].sessionID).toBe(cookie.sessionID)
		})
	})
}
