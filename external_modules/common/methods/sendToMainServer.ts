import Transaction from '../db/models/transaction'
import PendingTx, { PTx } from '../db/models/pendingTx'
import Account from '../db/models/account'
import Common, { TxReceived } from '../index'
import { ObjectId } from 'bson'

export function sendToMainServer(this: Common) {
	/**
	 * Ao se conectar, informa o main server de todas as transações pendentes
	 * ainda não informadas
	 */
	this._events.on('connected', () => {
		const transactions = PendingTx.find({
			'received.opid': { $exists: false }
		}).lean().cursor()

		transactions.on('data', async (transaction: PTx) => {
			const opid = await _sendToMainServer(transaction.received)
			if (!opid) return

			if (transaction.received.status === 'confirmed') {
				/** Deleta a Tx confirmada da collection de Tx pendentes */
				await PendingTx.deleteOne({ txid: transaction.received.txid })
			} else {
				/** Atualiza o opid da transação pendente */
				await PendingTx.updateOne({
					txid: transaction.received.txid
				}, {
					$set: {
						'received.opid': new ObjectId(opid)
					}
				})
			}
		})
	})

	/**
	 * Envia uma transação ao servidor principal e atualiza o opid dela no
	 * database
	 * 
	 * @param transaction A transação que será enviada ao servidor
	 * 
	 * @returns opid se o envio foi bem-sucedido
	 * @returns void se a transação não foi enviada
	 */
	const _sendToMainServer = async (transaction: TxReceived): Promise<string|void> => {
		try {
			const opid: string = await this.module('new_transaction', transaction)
			
			/** Adiciona o opid à transação no db local */
			await Transaction.findOneAndUpdate({
				txid: transaction.txid
			}, {
				opid: new ObjectId(opid)
			})

			return opid
		} catch (err) {
			if (err === 'SocketDisconnected') {
				/**
				 * Salva a Tx no database para ser enviada quando
				 * reconectar-se ao main
				 */
				await new PendingTx({
					txid: transaction.txid,
					transaction: transaction,
				}).save().catch(err => {
					if (err.code != 11000) throw err
				})
			} else if (err.code === 'UserNotFound') {
				await Account.deleteOne({ account: transaction.account })
				await Transaction.deleteMany({ account: transaction.account })
				await PendingTx.deleteMany({ 'received.account': transaction.account })
			} else if (err.code === 'TransactionExists' && err.transaction.opid) {
				await Transaction.updateOne({
					txid: transaction.txid
				}, {
					opid: new ObjectId(err.transaction.opid)
				})
				return err.transaction.opid
			} else {
				throw err
			}
		}
	}

	return _sendToMainServer
}
