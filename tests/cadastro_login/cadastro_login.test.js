const registerTest = require('./register_test')
const loginTest = require('./login_test')
const { cleanDatabase } = require('../fixtures/db')
const user = {
	email: 'user@example.com',
	password: 'userP@ss'
}

beforeAll(cleanDatabase)

describe('signUp and login', () => {
	registerTest(user)
	loginTest(user)
 })
