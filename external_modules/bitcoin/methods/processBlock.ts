import { Bitcoin } from '../index'
import unconfirmedTx from '../db/models/unconfirmedTx'
import { Transaction as Tx } from '../../common'

export function processBlock(this: Bitcoin) {
	/**
	 * Verifica se uma transação foi confirmada e em caso positivo,
	 * remove-a do database. Em caso negativo atualiza a quantidade de
	 * confirmacoes que ela tem
	 */
	const getConfirmed = (txid: Tx['txid']): void => {
		this.rpc.transactionInfo(txid).then(txInfo => {
			if (txInfo.confirmations >= 6) {
				console.log({
					txid,
					confirmed: true,
					confirmations: txInfo.confirmations
				})
				unconfirmedTx.deleteOne({ txid }).exec()
				/**
				 * @todo redirecionar a quantidade de confirmaçoes para o
				 * servidor principal
				 */
			} else {
				unconfirmedTx.updateOne({
					txid
				}, {
					confirmations: txInfo.confirmations
				}).exec()
			}
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
		/** Procura por todas as transações não confirmadas no database */
		try {
			const transaction = await unconfirmedTx.find()
			if (transaction.length > 0)
				transaction.forEach(tx => getConfirmed(tx.txid))
		} catch(err) {
			console.error('Block processing error', err)
		}
	}

	return _processBlock
}
