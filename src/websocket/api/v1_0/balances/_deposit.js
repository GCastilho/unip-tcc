/**
 * src/websocket/api/v1_0/teste/_deposit.js
 * rota para deposito de moedas
 */
module.exports = function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'deposit')
	socket.rotas.set(upRota + 'deposit', function (request) {

		/**
         * TODO: Deposit Route
         */


		/**
         * retorna o request modificado com as informações requisitadas
         */
		return request// é necessario retornar o request;
	})
}
