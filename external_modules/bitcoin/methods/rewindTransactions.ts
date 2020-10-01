import { Bitcoin } from '../index'
import meta from '../../common/db/models/meta'
import { ObjectId } from 'mongodb'
import Account from '../../common/db/models/account'
import Transaction from '../../common/db/models/transaction'
import { ReceivedPending } from '../../common/db/models/pendingTx'
import type { TxReceived } from '../../../interfaces/transaction'

async function formatTransaction(txInfo: any): Promise<TxReceived|void> {
	if (txInfo.category != 'receive') return

	const address: TxReceived['account'] = txInfo.address

	/** Verifica se a transação é nossa */
	const account = await Account.findOne({ account: address })
	if (!account) return
	return {
		txid:          txInfo.txid,
		status:        'pending',
		confirmations: txInfo.confirmations,
		account:       address,
		amount:        txInfo.amount,
		timestamp:     txInfo.time * 1000 // O timestamp do bitcoin é em segundos
	}
}

export async function rewindTransactions(this: Bitcoin, newBlockhash: string) {
	this.rewinding = true

	let blockhash = (await meta.findOne({ info: 'lastKnowHash' }))?.details
	if (!blockhash) {
		//the first VALID bitcoin BlockHash
		blockhash = '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943'
		await meta.updateOne({
			info: 'lastKnowHash'
		}, {
			details: blockhash
		}, {
			upsert: true
		})
	}
	const { transactions } = await this.rpc.listSinceBlock(blockhash) as { transactions: any[] }
	for (const tx of transactions) {
		try {
			const transaction = await formatTransaction(tx)
			if (!transaction) continue

			/** Salva a nova transação no database */
			await new Transaction({
				txid: transaction.txid,
				type: 'receive',
				account: transaction.account
			}).save()

			/** Salva a nova transação na collection de Tx pendente */
			await new ReceivedPending({
				txid: transaction.txid,
				transaction: transaction
			}).save()

			/**
			 * opid vai ser undefined caso a transação não tenha sido enviada ao
			 * main, nesse caso não há mais nada o que fazer aqui
			 */
			const opid = await this.informMain.newTransaction(transaction)
			if (!opid) continue

			await ReceivedPending.updateOne({
				txid : transaction.txid
			}, {
				$set: {
					'transaction.opid': new ObjectId(opid)
				}
			})
		} catch (err) {
			/**
			 * O evento de transação recebida acontece quando a transação é
			 * recebida e quando ela recebe a primeira confimação, o que causa um
			 * erro 11000
			 */
			if (err.code != 11000)
				console.error('Transaction processing error:', err)
		}
	}

	await meta.updateOne({
		info: 'lastKnowHash'
	}, {
		details: newBlockhash
	}, {
		upsert: true
	})

	this.blockHeight = (await this.rpc.getBlockChainInfo())?.height
	this.rewinding = false
}
