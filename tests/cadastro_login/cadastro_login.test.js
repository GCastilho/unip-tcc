const registerTest = require('./register_test')
const loginTest = require('./login_test')
const { cleanDatabase } = require('../fixtures/db')

beforeAll(cleanDatabase)

describe('signUp and login', () => {
	registerTest()
	loginTest()
 })
