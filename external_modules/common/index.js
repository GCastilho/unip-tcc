const Currency = process.env.CURRENCY
const main_server_ip = process.env.main_server_ip || 'localhost:8085'
const axios = require("axios")
const Account = require(`../${Currency}/db/models/account`)
const server = require(`./server`)


/** Conecta ao mongodb */
const db = require(`../${Currency}/db/mongoose`)

/** Setup database */
db.connection.on('connected', () => {
	/** Limpa a collection accounts */
	Account.deleteMany().then(() => {
		process.stdout.write('Connecting to main server... ')
		return connectToMainServer()
	}).then(() => {
		process.stdout.write(`Connected!\nRequesting ${Currency} accounts...`)

		/** Solicita ao servidor principal a lista de contas NANO dos usuarios */
		return axios.get(`http://${main_server_ip}/account_list/${Currency}`, {
			responseType: 'stream'
		})
		
	}).then(({ data }) => {
		console.log('Success\nReceiving account stream and importing accounts into private database')

		data.on('data', (chunk) => {
			/** Cada chunk é uma NANO account */
			new Account({ account: chunk.toString() }).save()
		})
		data.on('end', (chunk) => {
			console.log(`All ${Currency} accounts received and imported successfuly!`)
			server.listen()
		})
	})
})

/** Checa a conexão com o servidor principal. Retorna ao obter uma resposta */
function connectToMainServer() {
	return new Promise((resolve, reject) => {
		(function ping() {
			axios.get(`http://${main_server_ip}/ping/${Currency}`)
			.then(({ data }) => {
				if (data === 'pong')
					resolve()
				else
					reject(`Unrecognized response: ${data}`)
			}).catch(err => {
				/** Aguarda 10 segundos e tenta novamente */
				setTimeout(ping, 10000)
			})
		})()
	})
}
