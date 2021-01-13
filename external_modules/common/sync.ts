import { ObjectId } from 'mongodb'
import Account from './db/models/account'
import Transaction, { Receive, Send } from './db/models/newTransactions'
import type { ClientSession } from 'mongoose'
import type { ReceiveDoc, SendDoc } from './db/models/newTransactions'

/** Type para atualização de uma transação recebida */
type UpdateReceivedTx = {
	/** O id dessa transação na rede da moeda */
	txid: string
	/** O status dessa transação */
	status: 'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
}

/** Type para atualização de uma transação enviada */
export type UpdateSentTx = {
	/** O id dessa transação na rede da moeda */
	txid: string
	/** O status dessa transação */
	status: 'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
	/** O timestamp da transação na rede da moeda */
	timestamp: number|Date
}

export default class Sync {
	constructor(private emit: (event: string, ...args: any) => Promise<any>) {}

	public async uncompleted() {
		const query = Transaction.find({
			status: { $ne: 'requested' },
			completed: false
		}) as AsyncIterable<ReceiveDoc|SendDoc>

		for await (const tx of query) {
			if (tx.type == 'receive') {
				if (tx.opid) await this.updateReceived(tx)
				else await this.newTransaction(tx)
			} else {
				await this.updateSent(tx)
			}
		}
	}

	/**
	 * Envia o evento de uma transação ao servidor principal e atualiza seu opid
	 * no database
	 *
	 * @param transaction O documento da transação recebida que será enviada
	 * ao main server
	 */
	public async newTransaction(transaction: ReceiveDoc) {
		try {
			const opid = await this.emit('new_transaction', transaction)
			transaction.opid = new ObjectId(opid)
			if (transaction.status == 'confirmed') transaction.completed = true
			await transaction.save()
		} catch (err) {
			if (err === 'SocketDisconnected') {
				console.error('Não foi possível informar o main server da nova transação pois ele estava offline')
			} else if (err.code === 'UserNotFound') {
				await Account.deleteOne({ account: transaction.account })
				await Transaction.deleteMany({ account: transaction.account })
			} else if (err.code === 'TransactionExists' && err.transaction.opid) {
				transaction.opid = new ObjectId(err.transaction.opid)
				await transaction.save()
			} else {
				throw err
			}
		}
	}

	/**
	 * Atualiza uma transação recebida previamente informada ao main server
	 * @param updtReceived A atualização da atualização recebida
	 */
	public async updateReceived(updtReceived: UpdateReceivedTx) {
		const { txid } = updtReceived
		try {
			await this.emit('update_received_tx', updtReceived)
			if (updtReceived.status == 'confirmed') {
				await Receive.updateOne({ txid }, { completed: true })
			}
		} catch (err) {
			if (err === 'SocketDisconnected') return
			/**
			 * OperationNotFound significa ou que a transação não existe
			 * no main server ou que ela foi concluída (e está inacessível
			 * a um update)
			 */
			if (err.code != 'OperationNotFound') throw err
		}
	}

	/**
	 * Atualiza um request de withdraw recebido do main server
	 * @param updtSent A atualização da atualização enviada
	 */
	public async updateSent(updtSent: UpdateSentTx, session?: ClientSession) {
		const { txid } = updtSent
		const { opid } = await Send.findOne({ txid }, { opid: true }, { session }).orFail()
		try {
			await this.emit('update_sent_tx', { opid, ...updtSent })
			if (updtSent.status == 'confirmed') {
				await Transaction.updateOne({ opid }, { completed: true }, { session })
			}
		} catch (err) {
			if (err === 'SocketDisconnected') return
			if (err.code === 'OperationNotFound') {
				console.error(`Deleting non-existent withdraw transaction with opid: '${opid}'`)
				await Transaction.deleteOne({ opid }, { session })
			} else
				throw err
		}
	}
}
