/**
 * src/api/internal/index.js
 * 
 * @description Endpoint do servidor principal com os módulos conectores
 * das blockchains
 */

const currencies = ['nano', 'bitcoin']

class InternalApi {
	constructor() {
		/**
		 * @description Faz com que os módulos de cryptocurrencies sejam
		 * acessíveis pela API
		 */
		currencies.forEach(currency => {
			this[currency] = require(`./${currency}`)
		})
	}
}

module.exports = function() {
	if (!global.internal_api_controller)
		global.internal_api_controller = new InternalApi()
	return global.internal_api_controller
}()
