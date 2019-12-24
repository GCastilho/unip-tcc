import { ObjectId } from 'mongodb'
import Account from '../db/models/account'
import Transaction from '../db/models/transaction'
import Common, { TxReceived, UpdtReceived } from '../index'
import { UpdtSent } from '../../../src/db/models/transaction'
import { ReceivedPending, PReceived, PSent, SendPending } from '../db/models/pendingTx'

/**
 * Contém métodos para atualizar o main server de transações
 */
export function informMain(this: Common) {
	/**
	 * Atualzia o main server de todas as transações nas collections de
	 * transações pendentes
	 */
	this._events.on('connected', () => {
		const promises = [ _updateAllReceived, _updateAllsended ]
		promises.map(item => item())
		Promise.all(promises).catch(err => {
			console.error('Error on informMain:', err)
		})
	})

	/**
	 * Atualiza o servidor de todas das transações pendentes salvas na
	 * collection de ReceivedPending
	 */
	const _updateAllReceived = async () => {
		const transactions = ReceivedPending.find().cursor()

		let doc: PReceived
		while ( doc = await transactions.next() ) {
			if (doc.transaction.opid) {
				const txUpdate: UpdtReceived = {
					opid:          doc.transaction.opid,
					status:        doc.transaction.status,
					confirmations: doc.transaction.confirmations
				}
				await updateReceivedTx(txUpdate)
			} else {
				const opid = await newTransaction(doc.transaction)
				if (!opid) continue
				/** Atualiza o opid da transação pendente */
				await ReceivedPending.updateOne({
					txid: doc.transaction.txid
				}, {
					$set: {
						'transaction.opid': opid
					}
				})
			}
		}
	}

	/**
	 * Atualiza o servidor de todas das transações pendentes ENVIADAS salvas na
	 * collection de SendPending
	 */
	const _updateAllsended = async () => {
		const transactions = SendPending.find({
			'transaction.txid': { $exists: true }
		}).cursor()

		let doc: PSent
		while( doc = await transactions.next() ) {
			const { txid, status, timestamp, opid } = doc.transaction
			/** Checa se a transação foi enviada e salva sem erros */
			if (!txid || !status || !timestamp) continue
			const txUpdate: UpdtSent = { opid, txid, status, timestamp }
			await updateWithdraw(txUpdate)
		}
	}

	/**
	 * Envia uma transação ao servidor principal e atualiza o opid dela no
	 * database
	 * 
	 * @param transaction A transação que será enviada ao servidor
	 * 
	 * @returns opid se o envio foi bem-sucedido e a transação está pendente
	 * @returns void se a transação não foi enviada ou se estava confirmada
	 */
	const newTransaction = async (transaction: TxReceived): Promise<string|void> => {
		try {
			const opid: string = await this.module('new_transaction', transaction)
			
			/** Adiciona o opid à transação no db local */
			await Transaction.findOneAndUpdate({
				txid: transaction.txid
			}, {
				opid: new ObjectId(opid)
			})

			/** Caso esteja confirmada, deleta a tx da ReceivedPending */
			if (transaction.status === 'confirmed') {
				await ReceivedPending.deleteOne({ txid: transaction.txid })
				return
			}

			return opid
		} catch (err) {
			if (err === 'SocketDisconnected') {
				/**
				 * Salva a Tx no database para ser enviada quando
				 * reconectar-se ao main
				 */
				await new ReceivedPending({
					txid: transaction.txid,
					transaction: transaction,
				}).save().catch(err => {
					if (err.code != 11000) throw err
				})
			} else if (err.code === 'UserNotFound') {
				await Account.deleteOne({ account: transaction.account })
				await Transaction.deleteMany({ account: transaction.account })
				await ReceivedPending.deleteMany({ 'transaction.account': transaction.account })
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

	/**
	 * Atualiza uma transação recebida previamente informada ao main server
	 * @param txUpdate A atualização da atualização recebida
	 */
	const updateReceivedTx = async (txUpdate: UpdtReceived): Promise<void> => {
		try {
			await this.module('update_received_tx', txUpdate)
		} catch (err) {
			if (err === 'SocketDisconnected') return
			/**
			 * OperationNotFound significa ou que a transação não existe
			 * no main server ou que ela foi concluída (e está inacessível
			 * a um update), em ambos os casos o procedimento é
			 * deletar ela daqui
			 */
			if (err.code != 'OperationNotFound') throw err
		}

		/**
		 * Deleta a transação se conseguir informá-la ao main server e se
		 * ela estiver confirmed
		 */
		if (txUpdate.status === 'confirmed') {
			console.log('deleting confirmed received transaction', txUpdate)
			await ReceivedPending.deleteOne({ 'transaction.opid': txUpdate.opid })
		}
	}

	/**
	 * Atualiza um request de withdraw recebido do main server
	 * @param txUpdate A atualização da transação enviada
	 */
	const updateWithdraw = async (txUpdate: UpdtSent): Promise<void> => {
		try {
			await this.module('update_sent_tx', txUpdate)
			/**
			 * Deleta a transação se conseguir informá-la ao main server e se
			 * ela estiver confirmed
			 */
			if (txUpdate.status === 'confirmed') {
				console.log('deleting confirmed sended transaction', txUpdate)
				await SendPending.deleteOne({ opid: txUpdate.opid })
			}
		} catch(err) {
			if (err === 'SocketDisconnected') return
			else throw err
		}
	}

	return {
		newTransaction,
		updateReceivedTx,
		updateWithdraw
	}
}
