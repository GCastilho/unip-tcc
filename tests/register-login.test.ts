import '../src/libs'
import '../src/db/mongoose'
import request from 'supertest'
import { expect } from 'chai'
import Person from '../src/db/models/person'
import Checklist from '../src/db/models/checklist'
import * as CurrencyApi from '../src/currencyApi'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../src/server')

before(async () => {
	await Person.deleteMany({})
	await Checklist.deleteMany({})
})

describe('User register and login tests', function() {
	const user = {
		email: 'cadastro_login@example.com',
		password: 'userP@ss'
	}

	describe('Register request', () => {
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
})
