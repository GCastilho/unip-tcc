/**
 * src/websocket/api/v1_0/teste/ping.js
 * rota de teste de ping ou teste de conexão a api
 */
module.exports = function (socket, upRota) {
	if (socket.enableLog) console.log('-- criado rota: ' + upRota + 'ping')
	socket.rotas.set(upRota + 'ping', function (request) {

		/**
         * checa a estrutura para evitar exceptions
         * checa a "data" para saber se retorna a versão e o timestamp
         */

		if (request['data']['status']) {
			if (request['data']['status'] == 'ping') {
				request['data'] = {
					status: 'pong',
					version: 'API v1.0',
					timestamp: new Date().getTime()
				}
				request['status'] = 'success'
			}
		} else {
			request = { status: 'error', error: 'wrong request structure', request: request }
		}

		/**
         * retorna o request modificado com as informações requisitadas
         */
		return request// é necessario retornar o request;
	})
}