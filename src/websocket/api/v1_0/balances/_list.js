/**
 * src/websocket/api/v1_0/teste/_list.js
 * rota de listando todas as moedas 
 */
module.exports = function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'list')
	socket.rotas.set(upRota + 'list', function (request) {

		/**
         * retorna um array das moedas que se tem
         * TODO: carregar lista das coins do servidor
         */

		request['data'] = [
			{ code: 'ETH', name: 'Etherium', value: '0.00000000' },
			{ code: 'BTC', name: 'Bitcoin', value: '0.00000000' },
			{ code: 'NANO', name: 'NANO', value: '0.00000000' }
		]

		/**
         * retorna o request modificado com as informações requisitadas
         */
		return request// é necessario retornar o request;
	})
}