import Common from '../common'
import Account from '../common/db/models/account'
import * as rpc from './methods/rpc'
import * as methods from './methods'
import { fromRawToNano } from './utils/unitConverter'
import type { WithdrawRequest, WithdrawResponse, NewTransaction } from '../common'
import type { WebSocket } from './methods/Nano'

export class Nano extends Common {
	initBlockchainListener = methods.nanoWebSocket

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
	async processTransaction(block: WebSocket) {
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
}

const nano = new Nano()
nano.init()
