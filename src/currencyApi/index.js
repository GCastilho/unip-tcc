/*
 * src/currencyApi/index.js
 *
 * Endpoint do servidor principal com os módulos conectores das blockchains
 */

const currencies = require('./currencies')
const common = require('./common')
const self = require('./self')

class CurrencyApi {
	constructor() {
		/**
		 * Faz com que os módulos de cryptocurrencies sejam acessíveis pela
		 * API. A operação usa o spread para evitar que modificações em
		 * this.currencies afetem o módulo currencies, pois isso afetaria o
		 * cache do require, ou seja, mudaria o módulo globalmente
		 */
		this.currencies = {...{}, ...currencies}

		/**
		 * Insere propriedades/funções da common no módulo
		 * 'this.currencies.<currency>' sem sobrescrever propriedades que tenham
		 * o mesmo nome em um módulo individual. Ou seja, se uma função existir
		 * na common e no módulo de uma currency, a que irá prevalecer será
		 * o do módulo da currency
		 */
		for (let currency in currencies) {
			this.currencies[currency] = {...common, ...currencies[currency]}

			/** Inicializa o '_module' de cada currency */
			this.currencies[currency]._module(this.currencies[currency])
		}

		/** Insere os métodos da currencyApi, acessíveis por 'this.<method>' */
		for (let method in self) {
			this[method] = self[method]
		}
	}
}

module.exports = singleton = new CurrencyApi()

/** Load listener module */
require('./listener')
