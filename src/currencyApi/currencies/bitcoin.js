/**
 * src/api/internal/bitcoin.js
 */

module.exports = {
	code: 'btc',
	ip: process.env.BITCOIN_IP || 'localhost',
	port: 8091,
}
