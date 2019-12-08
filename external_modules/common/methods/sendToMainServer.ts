import Transaction from '../db/models/transaction'
import PendingTx, { PTx } from '../db/models/pendingTx'
import Account from '../db/models/account'
import Common, { Transaction as Tx } from '../index'
import { ObjectId } from 'bson'

export function sendToMainServer(this: Common) {
	/** Reenvia todas as transações pendentes sem opid ao se conectar com o main */
	this._events.on('connected', () => {
		const transactions = PendingTx.find({
			'transaction.opid': { $exists: false }
		}).lean().cursor()

		transactions.on('data', async (document: PTx) => {
			await _sendToMainServer(document.transaction)

			/** Deleta Tx da collection de transações pendentes */
			if (document.transaction.status === 'confirmed') {
				await PendingTx.deleteOne({ txid: document.transaction.txid })
			}
		})
	})

	const _sendToMainServer = async (transaction: Tx): Promise<void> => {
		try {
			const opid: Tx['opid'] = await this.module('new_transaction', transaction)
			
			/** Adiciona o opid à transação no db local */
			await Transaction.findOneAndUpdate({
				txid: transaction.txid
			}, {
				opid: new ObjectId(opid)
			})

			if (transaction.status != 'confirmed') {
				await new PendingTx({
					txid: transaction.txid,
					transaction: transaction,
				}).save().catch(err => {
					if (err.code != 11000) throw err
				})
			}
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
			} else if (err.code === 'TransactionExists' && err.transaction.opid) {
				await Transaction.updateOne({
					txid: transaction.txid
				}, {
					opid: new ObjectId(err.transaction.opid)
				})
			} else {
				throw err
			}
		}
	}

	return _sendToMainServer
}
