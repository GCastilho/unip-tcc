import WS from 'ws'
import ReconnectingWebSocket from 'reconnecting-websocket'
import Common from '../common'
import Account from '../common/db/models/account'
import { fromRawToNano } from './utils/unitConverter'
import * as rpc from './rpc'
import type { WebSocketMessage } from './rpc'
import type { WithdrawRequest, WithdrawResponse, NewTransaction } from '../common'

export class Nano extends Common {
	constructor() {
		super({
			name: 'nano',
		})
	}

	async getNewAccount(): Promise<string>{
		const { account } = await rpc.accountCreate()
		return account
	}

	async withdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
		const { account, amount } = request
		const { block } = await rpc.sendNano(account, amount)
		return {
			txid: block,
			status: 'confirmed',
			timestamp: Date.now()
		}
	}

	/**
	 * Processa blocos de receive da nano
	 * @param block O bloco que acabou de ser recebido
	 */
	async processTransaction(block: WebSocketMessage) {
		if (block.message.account == rpc.stdAccount) return

		const txArray: NewTransaction[] = []
		try {
			const { account, lastBlock } = await Account.findOne({
				account: block.message.account
			}).orFail()

			/** Procura por transações que não foram computadas */
			txArray.push(...await this.findMissingTx(account, lastBlock))
		} catch (err) {
			if (err == 'DocumentNotFoundError') return
			else throw new Error(`Error finding missing transactions:, ${err}`)
		}

		/**
		 * A transação mais recente deveria estar no txArray, entretanto, graças a
		 * velocidade do sistema, esse código pode rodar antes da atualização da
		 * blockchain ter concluído, por esse motivo a tx é adicionada manualmente
		 */
		if (txArray.findIndex(tx => tx.txid == block.message.hash) == -1) {
			txArray.push({
				txid:      block.message.hash,
				account:   block.message.account,
				status:    'confirmed',
				amount:    fromRawToNano(block.message.amount),
				timestamp: parseInt(block.time)
			})
		}

		for (const transaction of txArray) {
			await this.newTransaction(transaction)

			/**
			 * Redireciona o saldo recebido para a stdAccount
			 */
			await rpc.sendToStd(transaction.account, transaction.amount)
		}

		const { account, txid } = txArray[txArray.length - 1]
		await Account.updateOne({ account }, { lastBlock: txid })
	}


	/**
	 * Procura por transações não computadas até a última transação salva no db
	 * e as retorna em um array de Tx
	 *
	 * @param account A account para checar o histórico de transações
	 * @param lastBlock o utimo bloco recebido na account, armazenado no database
	 */
	async findMissingTx(account: string, lastBlock?: string) {
		const { open_block, frontier } = await rpc.accountInfo(account)
		const lastKnownBlock = lastBlock || open_block

		const receiveArray: NewTransaction[] = []
		let blockHash = frontier

		/** Segue a blockchain da nano até encontrar o lastKnownBlock */
		while (blockHash != lastKnownBlock) {
			const blockInfo = await rpc.blockInfo(blockHash)
			// Pega apenas blocos de received que foram confirmados
			if (blockInfo.subtype === 'receive' && blockInfo.confirmed === 'true') {
				receiveArray.push({
					txid: blockHash,
					account: blockInfo.block_account,
					status: 'confirmed',
					amount: fromRawToNano(blockInfo.amount),
					timestamp: parseInt(blockInfo.local_timestamp)
				})
			}
			blockHash = blockInfo.contents.previous
		}

		return receiveArray.reverse()
	}

	async initBlockchainListener() {
		const nanoSocketUrl = process.env.NANO_SOCKET_URL || 'ws://[::1]:57000'

		const ws = new ReconnectingWebSocket(nanoSocketUrl, [], {
			WebSocket: WS,
			connectionTimeout: 10000,
			maxRetries: 100000,
			maxReconnectionDelay: 2000, // Wait max of 2 seconds before retrying
		})

		/** Keep track if this is the first websocket connection */
		let firstConnection = true

		/** As soon as we connect, subscribe to block confirmations */
		ws.addEventListener('open', () => {
			console.log('Websocket connection open')
			firstConnection = false
			this.events.emit('rpc_connected')
			ws.send(JSON.stringify({
				action: 'subscribe',
				topic: 'confirmation',
				options: {
					/** Coloca todas as contas locais no filtro para serem observadas */
					all_local_accounts: true,
					//accounts: [array de contas extras que serão observadas]
				}
			}))
		})

		/**
		 * The node sent us a message
		 */
		ws.addEventListener('message', msg => {
			const data: WebSocketMessage = JSON.parse(msg.data)
			if (data.message.block.subtype != 'receive') return

			this.processTransaction(data).catch(err => {
				console.error('Error while processing socket message', err)
			})
		})

		ws.addEventListener('error', event => {
			const error = event.error as any
			if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
				if (firstConnection) {
					/**
					 * Não emite rpc_disconnected caso seja a primeira conexão
					 * com o websocket
					 */
					firstConnection = false
					console.error('Error connecting to nano websocket')
				} else if (this.nodeOnline) {
					console.error('Disconnected from nano websocket')
					this.events.emit('rpc_disconnected')
				}
			} else {
				console.error('WebSocket error observed:', event)
			}
		})
	}
}

const nano = new Nano()
nano.init()
