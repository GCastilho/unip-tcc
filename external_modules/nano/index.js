const axios = require("axios")
const Account = require('./db/models/account')
const server = require('./server')
const main_server_ip = process.env.MAIN_SERVER_IP || 'localhost:8085'

/** Conecta ao mongodb */
const db = require("./db/mongoose")

/** Inicia o NANO Web Socket */
require("./nanoWebSocket")

/** Setup database */
db.connection.on('connected', () => {
	/** Limpa a collection accounts */
	Account.deleteMany().then(() =>
		/** Solicita ao servidor principal a lista de contas NANO dos usuarios */
		axios.get(`http://${main_server_ip}/account_list/nano`, {
			responseType: 'stream'
		})
	).then(({ data }) => {
		data.on('data', (chunk) => {
			/** Cada chunk é uma NANO account */
			new Account ({ account: chunk.toString() }).save()
		})

		data.on('end', (chunk) => {
			console.log('All NANO accounts imported successfuly!')
			server.listen()
		})
	}).catch(err => {
		console.error(err)
		db.connection.close()
		process.exit(1)
	})
})
