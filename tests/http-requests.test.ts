import '../src/libs'
import request from 'supertest'
import { expect } from 'chai'
import cookieparser from 'cookieparser'
import Person from '../src/db/models/person'
import Checklist from '../src/db/models/checklist'
import Session from '../src/db/models/session'
import * as UserApi from '../src/userApi'
import * as CurrencyApi from '../src/currencyApi'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../src/server')

describe('Testing requests do the main domain', () => {
	before(async () => {
		await Person.deleteMany({})
		await Checklist.deleteMany({})
		await Session.deleteMany({})
	})

	const user = {
		email: 'cadastro_login@example.com',
		password: 'userP@ss'
	}

	describe('When making a register request', () => {
		it('Should fail if sending empty object', async () => {
			await request(app).post('/register').send({}).expect(400)
		})

		/** Esse teste pode, teoricamente, falhar por race condition */
		it('Should fail if email is null', async () => {
			const usersBefore = await Person.estimatedDocumentCount()
			await request(app).post('/register').send({
				password: 'null_email'
			}).expect(400)
			const usersAfter = await Person.estimatedDocumentCount()
			expect(usersBefore).to.equal(usersAfter)
		})

		it('Should fail if password is null', async () => {
			const _user = { email: 'user_null_pass@example.com' }
			await request(app).post('/register').send(_user).expect(400)

			// Assert user was NOT created
			expect(await Person.findOne({email: _user.email})).to.be.null
		})

		it('Should fail if email and password are null', async () => {
			await request(app).post('/register').send({
				email: '',
				password: ''
			}).expect(400)
		})

		it('Should signup new users', async () => {
			await request(app).post('/register').send(user).expect(201)

			// Assert user was created
			const person = await Person.findOne({email: user.email})
			expect(person).to.not.be.null

			// Assertions about the data saved in the database
			expect(person.credentials.salt).to.be.a('string')
			expect(person.credentials.password_hash).to.not.be.equal(user.password)
			expect(person.credentials.password_hash.length).to.be.gte(128)
		})

		it('Should fail if user already exists', async () => {
			await request(app).post('/register').send(user).expect(409)

			// Assert user was NOT created
			expect(await Person.find({email: user.email})).lengthOf(1)
		})

		it('Should have a create_account request for each currency', async () => {
			const currencies = CurrencyApi.currencies
			const createAccountRequests = await Checklist.find({ command: 'create_account' })
			expect(createAccountRequests).to.lengthOf(currencies.length)

			currencies.forEach(currency => {
				expect(
					createAccountRequests.some(item => item.currency === currency),
					`not found request for ${currency}`
				).to.be.true
			})
		})
	})

	describe('When making a login request', () => {
		it('Should replace this test with the api test for /v1/user/authentication')
		it('Should implement authentication and deauthentication on /v1/user/authentication')

		it('Should fail if sending empty object', async () => {
			await request(app).post('/login').send({}).expect(400)
		})

		it('Should fail if email is null', async () => {
			await request(app).post('/login').send({
				password: 'null_email'
			}).expect(400)
				.expect((res) => {
					expect(res.header['set-cookie']).to.be.undefined
					expect(res.body)
						.to.be.an('object')
						.to.haveOwnProperty('error')
				})
		})

		it('Should fail if password is null', async () => {
			await request(app).post('/login').send({
				email: 'null_password@example.com'
			}).expect(400)
				.expect(res => {
					expect(res.header['set-cookie']).to.be.undefined
					expect(res.body)
						.to.be.an('object')
						.to.haveOwnProperty('error')
				})
		})

		it('Should fail if email and password are null', async () => {
			await request(app).post('/login').send({
				email: '',
				password: ''
			}).expect(400)
				.expect(res => {
					expect(res.header['set-cookie']).to.be.undefined
					expect(res.body)
						.to.be.an('object')
						.to.haveOwnProperty('error')
				})
		})

		it('Should fail if non-existent user', async () => {
			await request(app).post('/login').send({
				email: 'undefined@example.com',
				password: 'undefined_pass'
			}).expect(401)
				.expect(res => {
					expect(res.header['set-cookie']).to.be.undefined
					expect(res.body)
						.to.be.an('object')
						.to.haveOwnProperty('error')
				})
		})

		it('Should fail if user with wrong password', async () => {
			await request(app).post('/login').send({
				email: user.email,
				password: 'not_user.password'
			}).expect(401)
				.expect(res => {
					expect(res.header['set-cookie']).to.be.undefined
					expect(res.body)
						.to.be.an('object')
						.to.haveOwnProperty('error')
				})
		})

		it('Should fail if valid password but wrong user', async () => {
			await request(app).post('/login').send({
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

		it('Should login existing users', async () => {
			const res = await request(app).post('/login').send(user)
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
	})

	describe('When making a request to update the password', () => {
		let sessionId: string

		before(async () => {
			const res = await request(app).post('/login').send(user)
				.expect(200)
			expect(res.header['set-cookie']).to.be.an('array')

			const cookies: any[] = res.header['set-cookie']
				.map(cookieparser.parse)
				.filter(cookie => cookie.sessionId)
			expect(cookies.length).to.equal(1)
			expect(cookies[0].sessionId).to.be.a('string')

			sessionId = cookies[0].sessionId
		})

		it('Should fail if sending an empty object', async () => {
			const { body } = await request(app)
				.post('/user/changepass').send({})
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({})
				.expect(400)

			expect(body).to.deep.equal({
				error: 'BadRequest',
				message: 'This request must contain a object with a oldPassword and newPassword properties'
			})
		})

		it('Should fail if not sending old_password', async () => {
			const { body } = await request(app)
				.post('/user/changepass')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({ newPassword: 'aNewPassword' })
				.expect(400)

			expect(body).to.deep.equal({
				error: 'BadRequest',
				message: 'This request must contain a object with a oldPassword and newPassword properties'
			})
		})

		it('Should fail if not sending new_password', async () => {
			const { body } = await request(app)
				.post('/user/changepass')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({ oldPassword: user.password })
				.expect(400)

			expect(body).to.deep.equal({
				error: 'BadRequest',
				message: 'This request must contain a object with a oldPassword and newPassword properties'
			})
		})

		it('Should fail if not authenticated', async () => {
			const { body } = await request(app)
				.post('/user/changepass')
				.send({
					oldPassword: user.password,
					newPassword: 'aNewPassword'
				})
				.expect(401)

			expect(body).to.deep.equal({
				error: 'NotLoggedIn',
				message: 'You must be logged in perform this operation'
			})
		})

		it('Should update the password from a user', async () => {
			const { body } = await request(app)
				.post('/user/changepass')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({
					oldPassword: user.password,
					newPassword: 'aNewPassword'
				})
				.expect(200)

			expect(body).to.deep.equal({
				message: 'Password updated'
			})

			const _user = await UserApi.findUser.byCookie(sessionId)
			expect(() => _user.checkPassword('aNewPassword')).to.not.throw()
		})
	})
})
