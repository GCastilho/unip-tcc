import express from 'express'
import bodyParser from 'body-parser'
import Common from '../common'
import * as methods from './methods'

export class Bitcoin extends Common {
	/** Número do bloco mais recente sincronizado */
	blockHeight = 0

	/**
	 * Indica se a função de rewinding de blocos está sendo executada ou não,
	 * bloqueando novas execuções do rewind
	 */
	rewinding = false

	protected rpc = methods.rpc

	rewindTransactions = methods.rewindTransactions

	getNewAccount = this.rpc.getNewAddress

	withdraw = this.rpc.send

	protected processTransaction = methods.processTransaction.bind(this)

	async initBlockchainListener() {
		const app = express()
		app.use(bodyParser.urlencoded({ extended: true }))

		/**
		 * Novas transações são enviadas aqui
		 */
		app.post('/transaction', (req, res) => {
			this.processTransaction(req.body.txid)
			res.end() // Finaliza a comunicação com o curl do BTC
		})

		/**
		 * Blocos novos são enviados aqui
		 */
		app.post('/block', (req, res) => {
			this.processBlock(req.body.block)
			res.end() // Finaliza a comunicação com o curl do BTC
		})

		/**
		 * Tenta repetidamente buscar pelo blockHeight da bitcoin (headers)
		 * bloqueia o modulo enquanto esse valor nao é encontrado
		 */
		do {
			try {
				this.blockHeight = (await this.rpc.getBlockChainInfo())?.headers
			} catch (err) {
				process.stdout.write('Failed to recover block height. ')
				if (err.name != 'RpcError' && err.code != 'ECONNREFUSED')
					console.error(err)
				console.error('Retring...')
				await (async () => new Promise(resolve => setTimeout(resolve, 30000)))()
			}
		} while (!this.blockHeight)

		console.log('Block height updated:', this.blockHeight)

		app.listen(this.port, () => {
			console.log('Bitcoin blockchain listener is up on port', this.port)
		})
	}

	constructor(bitcoinListenerPort: number) {
		super({
			name: 'bitcoin',
		})
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

	private processBlock = methods.processBlock.bind(this)
}

const bitcoin = new Bitcoin(8091)
bitcoin.init()
