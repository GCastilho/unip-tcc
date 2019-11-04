/**
 * src/api/internal/bitcoin.js
 */

module.exports = {
	code: 'btc',
	ip: process.env.BITCOIN_IP || '192.168.0.101',
	port: 1235,
}
