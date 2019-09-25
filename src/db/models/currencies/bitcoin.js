/*
 * src/db/models/currencies/bitcoin.js
 */

module.exports = {
	validate: [function bitcoin_account_validator(account) {
		return true
	}, 'Invalid bitcoin account address']
}
