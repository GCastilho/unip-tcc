/*
 * external_modules/common/connectToMainServer.js
 *
 * Checa a conexão com o servidor principal. Retorna ao obter uma resposta
 */

const axios = require("axios")

module.exports = async function connectToMainServer(currency) {
	process.stdout.write('Connecting to main server... ')
	return new Promise((resolve) => {
		(async function ping() {
			try {
				const { data } = await axios.get(
					`http://${global.main_server_ip}/ping/${currency}`
				)
				if (data !== 'pong')
					throw new AssertionError(`Unrecognized response: ${data}`)
				resolve()
			} catch (err) {
				if (err.code !== 'ECONNREFUSED') throw err
				/** Aguarda 10 segundos e tenta novamente */
				setTimeout(ping, 10000)
			}
		})()
	})
}
