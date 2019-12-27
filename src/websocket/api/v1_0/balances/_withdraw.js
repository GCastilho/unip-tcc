/**
 * src/websocket/api/v1_0/teste/_withdraw.js
 * rota de saque de moedas
 */

const currencyApi = require('../../../../currencyApi')
const userApi = require('../../../../userApi')

module.exports = function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'withdraw')
	socket.rotas.set(upRota + 'withdraw', async function (request) {
		console.log(request)
		const { email, currency, address, amount } = request.data
		const user = await userApi.findUser.byEmail(email)
		await currencyApi.withdraw(user, currency, address, amount)

		return request// é necessario retornar o request;
	})
}
