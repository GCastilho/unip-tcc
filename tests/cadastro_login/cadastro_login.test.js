require('../fixtures/db')	/** Carrega o DB e o mock da currencyApi */
const registerTest = require('./register_test')
const loginTest = require('./login_test')

const user = {
	email: 'user@example.com',
	password: 'userP@ss'
}

describe('signUp and login', () => {
	registerTest(user)
	loginTest(user)
 })
