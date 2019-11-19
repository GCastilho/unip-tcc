import Common from '../common'
import * as methods from './methods'
import express from 'express'
const bodyParser = require('body-parser')

const MAIN_SERVER_IP: string = process.env.MAIN_SERVER_IP || 'localhost'
const MAIN_SERVER_PORT: number = parseInt(process.env.MAIN_SERVER_PORT || '8085')

export class Bitcoin extends Common {
	name = 'bitcoin'
	mainServerIp = MAIN_SERVER_IP
	mainServerPort = MAIN_SERVER_PORT

	protected rpc = methods.rpc()

	createNewAccount = this.rpc.createAccount

	withdraw = this.rpc.send

	processTransaction = methods.processTransaction.bind(this)()

	initBlockchainListener() {
		const app = express()
		app.use(bodyParser.urlencoded())

		/**
		 * Novas transações são enviadas aqui
		 */
		app.post('/transaction', (req, res) => {
			this.processTransaction(req.body)
			res.send() // Finaliza a comunicação com o curl do BTC
		})

		/**
		 * Blocos novos são enviados aqui
		 */
		app.post('/block', (req, res) => {
			this.processBlock(req.body)
			res.send() // Finaliza a comunicação com o curl do BTC
		})

		app.listen(this.port, () => {
			console.log('Bitcoin blockchain listener is up on port', this.port)
		})
	}

	constructor(bitcoinCorePort: number) {
		super()
		this.port = bitcoinCorePort
	}

	private port: number

	private processBlock = methods.processBlock.bind(this)()
}

const bitcoin = new Bitcoin(8091)
bitcoin.init()
