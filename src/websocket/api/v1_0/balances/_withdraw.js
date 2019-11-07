/**
 * src/websocket/api/v1_0/teste/_withdraw.js
 * rota de saque de moedas
 */

const currencyApi = require('../../../../currencyApi')

module.exports = function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'withdraw')
	socket.rotas.set(upRota + 'withdraw', async function (request) {
		console.log(request)
		const { email, currency, address, amount } = request.data
		await currencyApi.withdraw(email, currency, address, amount)

		return request// é necessario retornar o request;
	})
}
