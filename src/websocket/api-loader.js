/**
 * src/websocket/api/index.js
 *
 * Inicializador do modulo API do WebSocket
 */
const fs = require('fs')
const path = require('path')

const subpath = 'api/'

module.exports = function (socket) {

	/**
	 * cria uma instancia de maping para sustentar as rotas
	 */
	if (!socket.rotas) {
		socket.rotas = new Map()
	}
	socket.enableLog = true //abilita o log de carregamento das rotas no console

	/**
	 * Carrega toda a lista de diretorios da pasta /api
	 * e carrega cada sub rota de cada versão da api
	 */

	fs.readdirSync(path.join(__dirname + '/api/')).forEach(apiVersion => {
		let subLoader = path.join(__dirname + '/api/' + apiVersion + '/index.js')
		if (fs.existsSync(subLoader)) {
			require(subLoader)(socket, subpath)
		}
	})

	/**
	 * instancia o handler de rotas
	 */
	socket.on('api', request => {
		/**
		 * JSON com o seguinte formato para o request
		 * {route:"api/v1.0/...", data:{...}}
		 * "route" sendo a rota de chamamento
		 * "data" os dados para um call ou um objeto vazio se for um get simples
		 */
		if (request['route'] && request['data']) {//checa a estrutura do json
			if (socket.rotas.has(request['route'])) {
				request = socket.rotas.get(request['route'])(request)
			} else {
				request['status'] = 'error'
				request['error'] = 'could not identify route'
			}
		} else {
			/**
			 * se a estrutura estiver invalida ele retorna um erro e o request enviado
			 */
			request = { status: 'error', error: 'wrong request structure', request: request }
		}
		socket.emit('api', request)
	})
}
