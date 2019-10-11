const registerTest = require('./register_test')
const loginTest = require('./login_test')
require('../fixtures/db')
const user = {
	email: 'user@example.com',
	password: 'userP@ss'
}

describe('signUp and login', () => {
	registerTest(user)
	loginTest(user)
 })
