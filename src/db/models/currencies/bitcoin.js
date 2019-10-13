/*
 * src/db/models/currencies/bitcoin.js
 */

module.exports = {
	validate: [function bitcoin_account_validator(accounts) {
		return true
	}, 'Invalid bitcoin account address']
}
