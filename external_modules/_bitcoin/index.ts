import Common from '../_common'
import * as methods from './methods'
import express from 'express'
import bodyParser from 'body-parser'

const MAIN_SERVER_IP: string = process.env.MAIN_SERVER_IP || 'localhost'
const MAIN_SERVER_PORT: number = parseInt(process.env.MAIN_SERVER_PORT || '8085')

class Bitcoin extends Common {
	name = 'bitcoin'
	mainServerIp = MAIN_SERVER_IP
	mainServerPort = MAIN_SERVER_PORT
	private port: number
	
	protected rpc = methods.rpc()

	createNewAccount = this.rpc.createAccount

	withdraw = this.rpc.send

	constructor(bitcoinCorePort: number) {
		super()
		this.port = bitcoinCorePort
	}

	initBlockchainListener() {
		const app = express()
		app.use(bodyParser.json())

		/**
		 * O Bitcoin core manda novas transações aqui
		 */
		app.post('/transaction', (req, res) => {
			this.processTransaction(req.body)
			res.send() // Finaliza a comunicação com o curl do BTC
		})

		app.listen(this.port, () => {
			console.log('Bitcoin blockchain listener is up on port', this.port)
		})
	}
}

const bitcoin = new Bitcoin(8091)
bitcoin.init()
