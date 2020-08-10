import { Bitcoin } from '../index'
import meta from '../../common/db/models/meta'
import { ObjectId } from 'mongodb'
import Account from '../../common/db/models/account'
import Transaction from '../../common/db/models/transaction'
import { ReceivedPending } from '../../common/db/models/pendingTx'
import { TxReceived } from '../../common'

async function formatTransaction(txInfo: any): Promise<TxReceived|void> {
	if(txInfo.category != 'receive') return

	const address: TxReceived['account'] = txInfo.address

	/** Verifica se a transação é nossa */
	const account = await Account.findOne({ account: address })
	if (!account) return

	const formattedTransaction: TxReceived = {
		txid:          txInfo.txid,
		status:        'pending',
		confirmations: txInfo.confirmations,
		account:       address,
		amount:        txInfo.amount,
		timestamp:     txInfo.time * 1000 // O timestamp do bitcoin é em segundos
	}

	return formattedTransaction
}


export async function rewindTransactions(this: Bitcoin, newBlockhash: string) {
	
	this.synchronizing = true
	let blockhash = (await meta.findOne({info: 'lastSyncBlock'}))?.details

	if (!blockhash) {
		blockhash = '0000000000000000000000000000000000000000000000000000000000000000'//(await this.rpc.blockInfo(newBlockhash))?.previousblockhash

		await meta.updateOne({
			info: 'lastSyncBlock'
		}, {
			details: blockhash
		}, {
			upsert: true
		})
	}
	const { transactions } = await this.rpc.listSinceBlock(blockhash)


	for (const transaction of transactions) {
		try {
			const _transaction = await formatTransaction(transaction)
			if (!_transaction) return
			console.log('received transaction', _transaction) //remove

			/** Salva a nova transação no database */
			await new Transaction({
				txid : _transaction.txid,
				type: 'receive',
				account: _transaction.account
			}).save().catch()

			/** Salva a nova transação na collection de Tx pendente */
			await new ReceivedPending({
				txid: _transaction.txid,
				transaction: _transaction
			}).save()

			/**
			 * opid vai ser undefined caso a transação não tenha sido enviada ao
			 * main, nesse caso não há mais nada o que fazer aqui
			 */

			const opid = await this.informMain.newTransaction(_transaction)
			if (!opid) return

			await ReceivedPending.updateOne({
				txid : _transaction.txid
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
		info: 'lastSyncBlock'
	}, {
		details: newBlockhash
	}, {
		upsert: true
	})
	this.blockHeight = (await this.rpc.getBlockChainInfo())?.height
	this.canSincronize = true

}


