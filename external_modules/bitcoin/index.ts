import express from 'express'
import bodyParser from 'body-parser'
import Common from '../common'
import * as rpc from './methods/rpc'
import * as methods from './methods'
import type { WithdrawRequest, WithdrawResponse } from '../common'

export class Bitcoin extends Common {
	private port: number

	/** Número do bloco mais recente sincronizado */
	private blockHeight: number

	private processBlock = methods.processBlock.bind(this)

	/**
	 * Indica se a função de rewinding de blocos está sendo executada ou não,
	 * bloqueando novas execuções do rewind
	 */
	protected rewinding: boolean

	rewindTransactions = methods.rewindTransactions

	getNewAccount = rpc.getNewAddress

	private processTransaction = methods.processTransaction.bind(this)

	constructor(bitcoinListenerPort: number) {
		super({
			name: 'bitcoin',
		})
		this.port = bitcoinListenerPort
		this.blockHeight = 0
		this.rewinding = false

		// Monitora os eventos do rpc para manter o nodeOnline atualizado
		rpc.events.on('rpc_connected', () => {
			if (!this.nodeOnline) this._events.emit('rpc_connected')
		})
		rpc.events.on('rpc_disconnected', () => {
			if (this.nodeOnline) this._events.emit('rpc_disconnected')
		})
	}

	async withdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
		const { account, amount } = request
		// TODO: Garantir que o cast to number do amount não dá problema com rounding
		const txid = await rpc.sendToAddress(account, Number(amount))
		const { confirmations, time } = await rpc.getTransactionInfo(txid)
		return {
			txid,
			confirmations,
			status: confirmations >= 3 ? 'confirmed' : 'pending',
			timestamp: time * 1000 // O timestamp do bitcoin é em segundos
		}
	}

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
				const { headers } = await rpc.getBlockChainInfo()
				this.blockHeight = headers
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
}

const bitcoin = new Bitcoin(8091)
bitcoin.init()
