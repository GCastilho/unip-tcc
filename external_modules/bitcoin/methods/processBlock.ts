import { Bitcoin } from '../index'
import unconfirmedTx, { UnconfirmedTx as uTx } from '../db/models/unconfirmedTx'
import { Transaction as Tx } from '../../common'
import { TxUpdt } from '../../../src/db/models/transaction'
import { formatTransaction, insertOpid } from './processTransaction'

export function processBlock(this: Bitcoin) {
	/**
	 * Verifica a quantidade de confirmações de uma transação e informa o
	 * servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const checkConfirmations = async (tx: uTx): Promise<void> => {
		try {
			const txInfo = await this.rpc.transactionInfo(tx.txid)

			/**
			 * Se não tem a opid é pq ou houve um erro ao inicialmente informar
			 * o main server ou pq o database local não tinha a tx mas o main
			 * server sim, então envia a transação para o main_server, pega o
			 * opid e continua
			 */
			if (!tx.opid) {
				const transaction = await formatTransaction(tx.txid, this.rpc.transactionInfo)
				try {
					// Informa o main da transação
					tx.opid = await this.module('new_transaction', transaction)
				} catch(err) {
					// A tx existia no main mas não no database local
					if (err.code === 'TransactionExists') {
						tx.opid = err.transaction.opid
					} else {
						throw err
					}
				}
				await insertOpid(tx.txid, tx.opid)
			}

			const status: Tx['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'

			await unconfirmedTx.updateOne({
				txid: tx.txid
			}, {
				confirmations: txInfo.confirmations
			})

			if (!tx.opid) return
			const txUpdate: TxUpdt = {
				opid: tx.opid,
				status,
				confirmations: status === 'confirmed' ? null : txInfo.confirmations
			}

			try {
				await this.module('transaction_update', txUpdate)
			} catch (err) {
				if (err === 'SocketDisconnected') return
				/**
				 * Um erro de OperationNotFound significa ou que a transação não
				 * existe no main server ou que ela foi concluída (e está
				 * inacessível a um update)
				 */
				if (err.code != 'OperationNotFound') throw err
			}
	
			/**
			 * Deleta a transação apenas se conseguir informá-la ao servidor
			 * principal ou se retornado OperationNotFound
			 */
			if (status === 'confirmed') {
				console.log('deleting confirmed transaction', {
					opid: tx.opid,
					txid: tx.txid,
					status,
					confirmations: txInfo.confirmations
				})
				await unconfirmedTx.deleteOne({ txid: tx.txid })
			}
		} catch (err) {
			console.error('Error cheking confirmations', err)
		}
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
			const transactions: uTx[] = await unconfirmedTx.find()
			if (transactions.length > 0)
				transactions.forEach(tx => checkConfirmations(tx))
		} catch(err) {
			console.error('Error fetching unconfirmed transactions', err)
		}
	}

	return _processBlock
}
