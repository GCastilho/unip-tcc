import express from 'express'
import bodyParser from 'body-parser'
import Common from '../common'
import * as methods from './methods'

const MAIN_SERVER_IP = process.env.MAIN_SERVER_IP || 'localhost'
const MAIN_SERVER_PORT = parseInt(process.env.MAIN_SERVER_PORT || '8085')

export class Bitcoin extends Common {
	name = 'bitcoin'
	mainServerIp = MAIN_SERVER_IP
	mainServerPort = MAIN_SERVER_PORT
	blockHeight = 20000000 //inicializado com um valor extremamente alto
	canSincronize = true
	protected rpc = methods.rpc

	rewindTransactions = methods.rewindTransactions

	getNewAccount = this.rpc.getNewAddress

	withdraw = this.rpc.send

	processTransaction = methods.processTransaction.bind(this)

	async initBlockchainListener() {
		const app = express()
		app.use(bodyParser.urlencoded({ extended: true }))

		/**
		 * Novas transações são enviadas aqui
		 */
		app.post('/transaction', (req, res) => {
			this.processTransaction(req.body.txid)
			res.send() // Finaliza a comunicação com o curl do BTC
		})

		/**
		 * Blocos novos são enviados aqui
		 */
		app.post('/block', (req, res) => {
			this.processBlock(req.body.block)
			res.send() // Finaliza a comunicação com o curl do BTC
		})

		async function sleep(time) {
			return new Promise(resolve => setTimeout(resolve, time))
		}
		let blockHeight = null
		const teste = await methods.rpc.getBlockCount()
		console.log('\n\n\n' + teste + '\n\n\n')
		do {
			try {
				blockHeight = (await this.rpc.getBlockChainInfo())?.headers
			} catch (e) {
				console.log('failed to recover block height')
				if (e.name != 'RpcError' && e.code != 'ECONNREFUSED')
					console.log(e)
				console.log('retring....')
			}
			console.log('the block is not updated')
			await sleep(30000) //30 segundos
		} while (!blockHeight)
		console.log('block height is updated')

		this.blockHeight = blockHeight

		console.log('current block height :' + this.blockHeight)

		app.listen(this.port, () => {
			console.log('Bitcoin blockchain listener is up on port', this.port)
		})
	}


	constructor(bitcoinListenerPort: number) {
		super()
		this.port = bitcoinListenerPort

		// Monitora os eventos do rpc para manter o nodeOnline atualizado
		this.rpc.events.on('rpc_success', () => {
			if (!this.nodeOnline) this._events.emit('rpc_connected')
		})
		this.rpc.events.on('rpc_refused', () => {
			if (this.nodeOnline) this._events.emit('rpc_disconnected')
		})
	}

	private port: number

	private processBlock = methods.processBlock.bind(this)()
}

const bitcoin = new Bitcoin(8091)
bitcoin.init()
