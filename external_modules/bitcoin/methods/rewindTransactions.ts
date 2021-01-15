import Meta from '../../common/db/models/meta'
import { Receive } from '../../common/db/models/newTransactions'
import { listSinceBlock, getBlockInfo } from './rpc'
import type { Bitcoin } from '../index'

export async function rewindTransactions(this: Bitcoin, newestBlockhash: string) {
	this.rewinding = true

	/** Se não encontrar no banco, default para primeiro blockhash válido */
	const lastKnowHash = await Meta.findOne({ info: 'lastKnowHash' })
		.map(doc => doc?.details || '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943')

	const { transactions } = await listSinceBlock(lastKnowHash)

	const storedTxs = await Receive.find({
		txid: {
			$in: transactions.map(tx => tx.txid)
		}
	})

	/**
	 * Filtra transações cuja combinação txid & account exista no DB; A account
	 * é checada não descartar transações em batch recebidas em que uma tá no
	 * banco e a outra misteriosamente não está
	 */
	const txs = transactions.filter(tx =>
		storedTxs.findIndex(s => s.txid == tx.txid && s.account == tx.address) == -1
	)

	for (const tx of txs) {
		await this.newTransaction({
			txid:          tx.txid,
			status:        tx.confirmations < 3 ? 'pending' : 'confirmed',
			confirmations: tx.confirmations,
			account:       tx.address,
			amount:        tx.amount,
			timestamp:     tx.time * 1000 // O timestamp do bitcoin é em segundos
		})
	}

	await Meta.updateOne({
		info: 'lastKnowHash'
	}, {
		details: newestBlockhash
	}, {
		upsert: true
	})

	this.blockHeight = (await getBlockInfo(newestBlockhash)).height
	this.rewinding = false
}
