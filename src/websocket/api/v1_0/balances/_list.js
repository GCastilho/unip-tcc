/* eslint-disable require-atomic-updates */
/**
 * src/websocket/api/v1_0/teste/_list.js
 * rota de listando todas as moedas 
 */

const currencyApi = require('../../../../currencyApi')

module.exports = async function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'list')
	socket.rotas.set(upRota + 'list', async function(request) {
		console.log(request)

		const currenciesList = await currencyApi.getCurrenciesList()
		for (let currency of currenciesList) {
			currency.balance = await currencyApi.getBalance(request.data.email, currency.name)
			currency.address = await currencyApi.getUserAccount(request.data.email, currency.name)
		}

		request['data'] = currenciesList
		/**
         * retorna o request modificado com as informações requisitadas
         */
		return request// é necessario retornar o request;
	})
}
