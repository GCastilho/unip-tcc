/*
 * src/db/models/currencies/nano.js
 */

const isValidNanoAccount = require('nano-address-validator')

module.exports = {
	validate: [function nano_account_validator(accounts) {
		return (accounts.every(account => isValidNanoAccount(account)))
	}, 'Invalid nano account address']
}
