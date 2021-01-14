import { getBlockInfo, getTransactionInfo } from './rpc'
import Transaction, { ReceiveDoc, SendDoc } from '../../common/db/models/newTransactions'
import type { Bitcoin } from '../index'

/**
 * Processa novos blocos recebidos da blockchain
 *
 * @param blockhash O hash do bloco enviado por curl pelo blockNotify
 */
export async function processBlock(this: Bitcoin, blockhash: string) {
	if (typeof blockhash != 'string') return

	try {
		const blockInfo = await getBlockInfo(blockhash)
		if (blockInfo.height < this.blockHeight || this.rewinding) return

		await this.rewindTransactions(blockhash)

		for await (const tx of Transaction.find({ status: 'pending' }) as AsyncIterable<ReceiveDoc|SendDoc>) {
			const { confirmations } = await getTransactionInfo(tx.txid)
			await this.updateTx({
				txid: tx.txid,
				status: confirmations >= 3 ? 'confirmed' : 'pending',
				confirmations
			})
		}
	} catch (err) {
		console.error('Error fetching unconfirmed transactions', err)
	}
}
