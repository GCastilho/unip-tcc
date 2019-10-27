/*
 * src/db/models/currencies/bitcoin.js
 */

module.exports = {
	// Habilitar quando implementar validator do bitcoin
	// validate: [function bitcoin_account_validator(accounts) {
	validate: [function bitcoin_account_validator() {
		return true
	}, 'Invalid bitcoin account address']
}
