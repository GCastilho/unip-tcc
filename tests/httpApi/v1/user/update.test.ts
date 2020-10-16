import '../../../../src/libs/extensions'
import express from 'express'
import request from 'supertest'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { ObjectId } from 'mongodb'
import api from '../../../../src/server/api'
import Person from '../../../../src/db/models/person'
import Session from '../../../../src/db/models/session'

chai.use(chaiAsPromised)

const app = express()
app.use(api)

describe('When making a request to update user data on the HTTP API version 1', () => {
	let userId: ObjectId
	let sessionId: string

	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}

	const notAuthorizedModel = {
		error: 'NotAuthorized',
		message: 'A valid cookie \'sessionId\' is required to perform this operation'
	}

	beforeEach(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})

		const { _id } = await Person.createOne(user.email, user.password)
		userId = _id

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

	describe('When updating user password', () => {
		it('Should fail if sending an empty object', async () => {
			const { body } = await request(app)
				.patch('/v1/user/password')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({})
				.expect(400)

			expect(body).to.deep.equal({
				error: 'BadRequest',
				message: 'This request must contain a object with an \'old\' and \'new\' properties'
			})
		})

		it('Should fail if not sending old_password', async () => {
			const { body } = await request(app)
				.patch('/v1/user/password')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({ new: 'aNewPassword' })
				.expect(400)

			expect(body).to.deep.equal({
				error: 'BadRequest',
				message: 'This request must contain a object with an \'old\' and \'new\' properties'
			})
		})

		it('Should fail if not sending new_password', async () => {
			const { body } = await request(app)
				.patch('/v1/user/password')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({ old: user.password })
				.expect(400)

			expect(body).to.deep.equal({
				error: 'BadRequest',
				message: 'This request must contain a object with an \'old\' and \'new\' properties'
			})
		})

		it('Should fail if not authenticated', async () => {
			const { body } = await request(app)
				.patch('/v1/user/password')
				.send({
					old: user.password,
					new: 'aNewPassword'
				})
				.expect(401)

			expect(body).to.deep.equal(notAuthorizedModel)
		})

		it('Should update the password from a user', async () => {
			const { body } = await request(app)
				.patch('/v1/user/password')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({
					old: user.password,
					new: 'aNewPassword'
				})
				.expect(200)

			expect(body).to.deep.equal({
				message: 'Password updated'
			})

			const updatedPerson = await Person.findById(userId).orFail()
			expect(updatedPerson.credentials.check('aNewPassword')).to.be.true
		})
	})
})
