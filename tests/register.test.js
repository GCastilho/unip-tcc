const request = require('supertest')
const app = require('../src/server')
const Person = require('../src/db/models/person')
const currencies = require('../src/currencyApi/currencies')
const { cleanDatabase, users } = require('./fixtures/db')

beforeAll(cleanDatabase)

describe('User signUp (/register)', () => {
	test('Should fail if email is null', async () => {
		const user = { password: 'somePassword' }
		const usersBefore = await Person.estimatedDocumentCount()
		await request(app).post('/register').send(user).expect(400)
		const usersAfter = await Person.estimatedDocumentCount()
		expect(usersBefore).toEqual(usersAfter)
	})

	test('Should fail if password is null', async () => {
		const user = { email: 'user3@example.com' }
		await request(app).post('/register').send(user).expect(400)

		// Assert user was NOT created
		expect(await Person.findOne({email: user.email})).toBeNull()
	})

	describe('Should signup new users', () => {
		users.forEach(user => {
			test(`${user.email}`, async () => {
				await request(app).post('/register').send(user).expect(201)

				// Assert user was created
				const person = await Person.findOne({email: user.email})
				expect(person).not.toBeNull()

				// Assertions about the data saved in the database
				expect(person.credentials.salt).toEqual(expect.any(String))
				expect(person.credentials.password_hash).not.toBe(user.password)
				expect(person.credentials.password_hash.length).toBeGreaterThanOrEqual(128)
			})
		})
	})

	describe('Should fail if user already exists', () => {
		users.forEach(user => {
			test(`${user.email}`, async () => {
				await request(app).post('/register').send(user).expect(409)

				// Assert user was NOT created
				expect(await Person.find({email: user.email})).toHaveLength(1)
			})
		})
	})

	describe('User should have at least ONE account of each currency', () => {
		users.forEach(user => {
			describe(`${user.email}`, () => {
				for(let currency in currencies) {
					test(currency, async () => {
						const person = await Person.findOne({email: user.email})
						expect(person.currencies[currency].length).toBeGreaterThanOrEqual(1)
					})
				}
			})
		})
	})
})
