import Common from '../common'
import Account from '../common/db/models/account'
import * as rpc from './methods/rpc'
import * as methods from './methods'
import { fromRawToNano } from './utils/unitConverter'
import type { WithdrawRequest, WithdrawResponse, NewTransaction } from '../common'
import type { WebSocket } from './methods/Nano'

export class Nano extends Common {
	findMissingTx = methods.findMissingTx

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
}

const nano = new Nano()
nano.init()
