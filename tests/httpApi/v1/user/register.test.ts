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

describe('When making a register request on the HTTP API version 1', () => {
	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}

	beforeEach(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})
	})

	it('Should fail if sending empty object', async () => {
		await request(app)
			.post('/v1/user')
			.send({})
			.expect(400)
	})

	it('Should fail if email is null', async () => {
		const usersBefore = await Person.estimatedDocumentCount()
		await request(app)
			.post('/v1/user')
			.send({ password: 'null_email' })
			.expect(400)

		const usersAfter = await Person.estimatedDocumentCount()
		expect(usersBefore).to.equal(usersAfter)
	})

	it('Should fail if password is null', async () => {
		await request(app)
			.post('/v1/user')
			.send({ email: 'null_pass@example.com' })
			.expect(400)

		// Assert user was NOT created
		await expect(Person.findOne({ email: 'null_pass@example.com' })).to
			.eventually.be.null
	})

	it('Should fail if email and password are null', async () => {
		await request(app)
			.post('/v1/user')
			.send({ email: '', password: '' })
			.expect(400)
	})

	it('Should signup new users', async () => {
		await request(app)
			.post('/v1/user')
			.send(user)
			.expect(201)

		// Assert user was created
		const person = await Person.findOne({ email: user.email })
		expect(person).to.be.an('object')

		// Assertions about the data saved in the database
		expect(person.credentials.salt).to.be.a('string')
		expect(person.credentials.password_hash).to.not.be.equal(user.password)
		expect(person.credentials.password_hash.length).to.be.gte(128)
	})

	it('Should fail if user already exists', async () => {
		await Person.createOne(user.email, user.password)

		await request(app)
			.post('/v1/user')
			.send(user)
			.expect(409)

		// Assert user was NOT created
		await expect(Person.find({ email: user.email })).to
			.eventually.have.lengthOf(1)
	})
})

