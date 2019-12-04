import { Bitcoin } from '../index'
import unconfirmedTx, { unconfirmedTx as uTx } from '../db/models/unconfirmedTx'
import { Transaction as Tx } from '../../common'
import { TxUpdt } from '../../../src/db/models/transaction'

export function processBlock(this: Bitcoin) {
	/**
	 * Verifica a quantidade de confirmações de uma transação e informa o
	 * servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const checkConfirmations = (tx: uTx): void => {
		this.rpc.transactionInfo(tx.txid).then(txInfo => {
			let status: Tx['status'] = 'pending'

			if (txInfo.confirmations >= 6) {
				status = 'confirmed'
				unconfirmedTx.deleteOne({ txid: tx.txid }).exec()
				console.log('transaction confirmed', {
					txid: tx.txid,
					status,
					confirmations: txInfo.confirmations
				})
			} else {
				unconfirmedTx.updateOne({
					txid: tx.txid
				}, {
					confirmations: txInfo.confirmations
				}).exec()
			}

			if (!tx.opid)
				throw 'Error: \'opid\' is required to update a transaction'

			const txUpdate: TxUpdt = {
				opid: tx.opid,
				status,
				confirmations: txInfo.confirmations >= 6 ? undefined : txInfo.confirmations
			}

			this.module('transaction_update', txUpdate)
		}).catch(err => {
			console.log('rpc error', err)
		})
	}

	/**
	 * Processa novos blocos recebidos da blockchain
	 * 
	 * @param body O body enviado pelo curl que o RPC do bitcoin faz
	 */
	const _processBlock = async (body: any) => {
		if (!body.block) return
		try {
			/** Todas as transações não confirmadas no database */
			const transaction: uTx[] = await unconfirmedTx.find()
			if (transaction.length > 0)
				transaction.forEach(tx => checkConfirmations(tx))
		} catch(err) {
			console.error('Block processing error', err)
		}
	}

	return _processBlock
}
