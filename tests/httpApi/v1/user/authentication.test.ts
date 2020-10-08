import '../../../../src/libs/extensions'
import express from 'express'
import request from 'supertest'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import api from '../../../../src/server/api'
import Person from '../../../../src/db/models/person'
import Session from '../../../../src/db/models/session'

chai.use(chaiAsPromised)

const app = express()
app.use(api)

describe('Testing authentication on the HHTP API version 1', () => {
	let sessionId: string

	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}

	beforeEach(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})

		await Person.createOne(user.email, user.password)

		const res = await request(app)
			.post('/v1/user/authentication')
			.send(user)
			.expect(200)

		expect(res.header['set-cookie']).to.be.an('array')
		sessionId = res.header['set-cookie'].map((cookies: string) => {
			const match = cookies.match(new RegExp('(^| )sessionId=([^;]+)'))
			return match ? match[2] : ''
		})[0]
	})

	it('Should authenticate an existing users', async () => {
		const res = await request(app)
			.post('/v1/user/authentication')
			.send(user)
			.expect(200)

		expect(res.header['set-cookie']).not.to.be.undefined

		const cookie = res.header['set-cookie'].map((cookies: string) => {
			const match = cookies.match(new RegExp('(^| )sessionId=([^;]+)'))
			return match ? match[2] : ''
		})[0]

		const { _id } = await Person.findOne({ email: user.email })
		const session = await Session.findOne({ userId: _id })
		expect(cookie).to.be.equal(session.sessionId)
	})

	it('Should deauthenticate an existing user', async () => {
		const res = await request(app)
			.delete('/v1/user/authentication')
			.set('Cookie', [`sessionId=${sessionId}`])
			.send()
			.expect(200)

		const cookie: string = res.header['set-cookie'][0]
		expect(cookie).to.includes('sessionId=')
		expect(cookie).to.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
	})

	it('Should fail if sending empty object', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({})
			.expect(400)
	})

	it('Should fail if email is null', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({ password: 'null_email' })
			.expect(400)
			.expect(res => {
				expect(res.header['set-cookie']).to.be.undefined
				expect(res.body)
					.to.be.an('object')
					.to.haveOwnProperty('error')
			})
	})

	it('Should fail if password is null', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({ email: 'null_password@example.com' })
			.expect(400)

			.expect(res => {
				expect(res.header['set-cookie']).to.be.undefined
				expect(res.body)
					.to.be.an('object')
					.to.haveOwnProperty('error')
			})
	})

	it('Should fail if email and password are null', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({ email: '', password: '' })
			.expect(400)

			.expect(res => {
				expect(res.header['set-cookie']).to.be.undefined
				expect(res.body)
					.to.be.an('object')
					.to.haveOwnProperty('error')
			})
	})

	it('Should fail if non-existent user', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({
				email: 'undefined@example.com',
				password: 'undefined_pass'
			})
			.expect(401)

			.expect(res => {
				expect(res.header['set-cookie']).to.be.undefined
				expect(res.body)
					.to.be.an('object')
					.to.haveOwnProperty('error')
			})
	})

	it('Should fail if user with wrong password', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({
				email: user.email,
				password: 'not_user.password'
			})
			.expect(401)

			.expect(res => {
				expect(res.header['set-cookie']).to.be.undefined
				expect(res.body)
					.to.be.an('object')
					.to.haveOwnProperty('error')
			})
	})

	it('Should fail if valid password but wrong user', async () => {
		await request(app)
			.post('/v1/user/authentication')
			.send({
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
})
