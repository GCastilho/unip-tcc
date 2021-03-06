import '../../../../src/libs/extensions'
import express from 'express'
import request from 'supertest'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { ObjectId } from 'mongodb'
import { currencyNames } from '../../../../src/libs/currencies'
import api from '../../../../src/server/api'
import Person from '../../../../src/db/models/person'
import Session from '../../../../src/db/models/session'

chai.use(chaiAsPromised)

const app = express()
app.use(api)

describe('Testing user accounts endpoint on the HTTP API version 1', () => {
	let userId: ObjectId
	let authorization: string

	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}

	const notAuthorizedModel = {
		error: 'NotAuthorized',
		message: 'A valid header \'Authorization\' is required to perform this operation'
	}

	beforeEach(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})

		const { _id } = await Person.createOne(user.email, user.password)
		userId = _id

		for (const currency of currencyNames) {
			await Person.findByIdAndUpdate(userId, {
				$push: {
					[`currencies.${currency}.accounts`]: `${currency}-account`
				}
			})
		}

		const res = await request(app)
			.post('/v1/user/authentication')
			.send(user)
			.expect(200)

		authorization = res.body.authorization
	})

	it('Should return Not Authorized if invalid or missing sessionId', async () => {
		const { body } = await request(app).get('/v1/user/accounts').send()
			.expect(401)
		expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
	})

	it('should return a accounts object from the user', async () => {
		const { body } = await request(app)
			.get('/v1/user/accounts')
			.set({ authorization })
			.send()
			.expect(200)

		expect(body).to.be.an('object')
		for (const key in body) {
			expect(key).to.be.oneOf(currencyNames)
		}
		const person = await Person.findById(userId)
		for (const currency of currencyNames) {
			expect(body).to.have.deep.property(currency, person.currencies[currency].accounts)
		}
	})
})
