/*
 * src/db/models/currencies/nano.js
 */

module.exports = {
	validate: [function nano_account_validator(account) {
		return true
	}, 'Invalid nano account address']
}
