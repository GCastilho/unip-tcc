/**
 * src/api/internal/bitcoin.js
 */

module.exports = {
	name: 'bitcoin',
	port: 1235,

	hello: function hello(params) {
		return `Esse hello vem da ${this.name}`
	}
}
