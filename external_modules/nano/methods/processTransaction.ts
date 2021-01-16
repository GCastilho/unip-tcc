import Account from '../../common/db/models/account'
import { fromRawToNano, fromNanoToRaw } from '../utils/unitConverter'
import type { Nano } from '../index'
import type { NewTransaction } from '../../common'

/**
 * Processa blocos de receive da nano
 *
 * @param block O bloco que acabou de ser recebido
 */
export async function processTransaction(this: Nano, block: Nano.WebSocket): Promise<void> {
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
		 * Não redireciona para a stdAccount transações recebidas na stdAccount
		 */
		if (transaction.account === this.stdAccount) continue

		/**
		 * Redireciona o saldo recebido para a stdAccount
		 */
		await this.rpc.request({
			action: 'send',
			wallet: this.wallet,
			source: transaction.account,
			destination: this.stdAccount,
			amount: fromNanoToRaw(transaction.amount.toString())
		})
	}

	const { account, txid } = txArray[txArray.length - 1]
	await Account.updateOne({ account }, { lastBlock: txid })
}
