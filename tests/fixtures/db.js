const request = require('supertest')
const db = require('mongoose')
const app = require('../../src/server')
const Person = require('../../src/db/models/person')
const Cookie = require('../../src/db/models/cookie')

/** Carrega o mock da currencyApi */
require('../__mocks__/currencyApi')

const users = [{
	email: 'user1@example.com',
	password: 'userOneP@ss'
}, {
	email: 'user3@example.com',
	password: 'userTwoP@ss'
}, {
	email: 'user4@example.com',
	password: 'userTreeP@ss'
}, {
	email: 'user5@example.com',
	password: 'userFourP@ss'
}, {
	email: 'user6@example.com',
	password: 'userFiveP@ss'
}]

async function setupUsers() {
	for (let user of users) {
		await request(app).post('/register').send(user).expect(201)
	}
}

beforeAll(async () => {
	await Person.deleteMany()
	await Cookie.deleteMany()
})

afterAll(async () => {
	await db.disconnect()
})

module.exports = {
	users,
	setupUsers
}
