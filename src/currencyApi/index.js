/*
 * src/currencyApi/index.js
 *
 * Endpoint do servidor principal com os módulos conectores das blockchains
 */

const currencies = require('./currencies')
const common = require('./common')

class CurrencyApi {
	constructor() {
		/**
		 * @description Faz com que os módulos de cryptocurrencies sejam
		 * acessíveis pela API
		 */
		this.currencies = currencies
		/**
		 * @description Insere propriedades/funções da common no módulo
		 * 'this.currencies[currency]' sem sobrescrever propriedades que tenham
		 * o mesmo nome em um módulo individual. Ou seja, se uma função existir
		 * na common e no módulo de uma currency, a que irá prevalecer será
		 * o do módulo da currency
		 */
		Object.keys(this.currencies).forEach(currency => {
			this.currencies[currency] = {...common, ...this.currencies[currency]}
		})
	}
}

module.exports = singleton = new CurrencyApi()

/** Load listener module */
require('./listener')
