/*
 * src/api/internal/index.js
 *
 * Endpoint do servidor principal com os módulos conectores das blockchains
 */

const currencies = require('./currencies')

class CurrencyApi {
	constructor() {
		/**
		 * @description Faz com que os módulos de cryptocurrencies sejam
		 * acessíveis pela API
		 */
		this.currencies = currencies
	}

	teste(argument) {
		console.log(argument)
	}
}

module.exports = singleton = new CurrencyApi()

require('./listener')(singleton)
