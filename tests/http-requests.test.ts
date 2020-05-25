import '../src/libs'
import request from 'supertest'
import { expect } from 'chai'
import cookieparser from 'cookieparser'
import Person from '../src/db/models/person'
import Checklist from '../src/db/models/checklist'
import Session from '../src/db/models/session'
import * as UserApi from '../src/userApi'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../src/server')

describe('Testing requests do the main domain', () => {
	const user = {
		email: 'cadastro_login@example.com',
		password: 'userP@ss'
	}

	before(async () => {
		await Person.deleteMany({})
		await Checklist.deleteMany({})
		await Session.deleteMany({})
		await UserApi.createUser(user.email, user.password)
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
			await expect(_user.checkPassword('aNewPassword')).to.eventually.be.fulfilled
		})
	})
})
