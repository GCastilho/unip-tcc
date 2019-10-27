const request = require('supertest')
const app = require('../../src/server')
const Person = require('../../src/db/models/person')
const currencies = require('../../src/currencyApi/currencies')

module.exports = function register_test(user) {
	describe('User signUp (/register)', () => {
		test('Should fail if sending empty object', async () => {
			await request(app).post('/register').send({}).expect(400)
		})

		/** Esse teste pode, teoricamente, falhar por race condition */
		test('Should fail if email is null', async () => {
			const usersBefore = await Person.estimatedDocumentCount()
			await request(app).post('/register').send({
				password: 'null_email'
			}).expect(400)
			const usersAfter = await Person.estimatedDocumentCount()
			expect(usersBefore).toEqual(usersAfter)
		})

		test('Should fail if password is null', async () => {
			const _user = { email: 'user_null_pass@example.com' }
			await request(app).post('/register').send(_user).expect(400)

			// Assert user was NOT created
			expect(await Person.findOne({email: _user.email})).toBeNull()
		})

		test('Should fail if email and password are null', async () => {
			await request(app).post('/register').send({
				email: '',
				password: ''
			}).expect(400)
		})

		test('Should signup new users', async () => {
			await request(app).post('/register').send(user).expect(201)

			// Assert user was created
			const person = await Person.findOne({email: user.email})
			expect(person).not.toBeNull()

			// Assertions about the data saved in the database
			expect(person.credentials.salt).toEqual(expect.any(String))
			expect(person.credentials.password_hash).not.toBe(user.password)
			expect(person.credentials.password_hash.length).toBeGreaterThanOrEqual(128)
		})

		test('Should fail if user already exists', async () => {
			await request(app).post('/register').send(user).expect(409)

			// Assert user was NOT created
			expect(await Person.find({email: user.email})).toHaveLength(1)
		})

		// describe('The user should have at least ONE account of each currency', () => {
		// 	for(let currency in currencies) {
		// 		test(currency, async () => {
		// 			const person = await Person.findOne({email: user.email})
		// 			expect(person.currencies[currency].length).toBeGreaterThanOrEqual(1)
		// 		})
		// 	}
		// })
	})
}
