/* eslint-disable require-atomic-updates */
/**
 * src/websocket/api/v1_0/teste/_list.js
 * rota de listando todas as moedas 
 */

const currencyApi = require('../../../../currencyApi')
const userApi = require('../../../../userApi')

module.exports = async function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'list')
	socket.rotas.set(upRota + 'list', async function(request) {
		console.log(request)

		const currenciesList = currencyApi.currenciesDetailed
		const user = await userApi.user(request.data.email)
		for (let currency of currenciesList) {
			currency.balance = user.getBalance(currency.name)
			currency.address = user.getAccounts(currency.name)
		}

		request['data'] = currenciesList
		/**
         * retorna o request modificado com as informações requisitadas
         */
		return request// é necessario retornar o request;
	})
}
