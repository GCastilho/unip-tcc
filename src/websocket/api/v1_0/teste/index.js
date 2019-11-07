/**
 * src/websocket/api/v1_0/teste/index.js
 * 
 * Rotas da sub rota api/v1.0/teste
 * todas as sub rotas desse tronco não modificam nada no servidor
 * servem apenas para proposito de teste
 */
const fs = require('fs')
const path = require('path')

const subpath = 'test/'

module.exports = function (socket, upRota) {

	/**
     * carrega dinamicamente as rotas dentro desse tronco
     */
	fs.readdirSync(path.join(__dirname + '/')).forEach(rota => {
		if (rota != 'index.js') { //ignora a si mesmo
			let subLoader = path.join(__dirname + '/' + rota)
			if (fs.existsSync(subLoader))
				require(subLoader)(socket, upRota + subpath)
		}
	})
}