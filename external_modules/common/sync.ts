import assert from 'assert'
import { ObjectId } from 'mongodb'
import Account from './db/models/account'
import Transaction, { Receive } from './db/models/transaction'
import type Common from '.'
import type { ReceiveDoc, SendDoc, CreateReceive, CreateSend } from './db/models/transaction'

/** Type para atualização de uma transação recebida */
type UpdateReceivedTx = Pick<CreateReceive, 'txid'|'status'|'confirmations'>

/** Type para atualização de uma transação enviada */
type UpdateSentTx = Pick<CreateSend, 'opid'|'txid'|'status'|'confirmations'|'timestamp'>

export default class Sync {
	constructor(private emit: Common['emit']) {}

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
		const { txid, account, amount, status, confirmations, timestamp } = transaction

		try {
			const opid = await this.emit('new_transaction', {
				txid,
				account,
				amount,
				status,
				confirmations,
				timestamp: timestamp.getTime()
			})
			transaction.opid = new ObjectId(opid)
			if (transaction.status == 'confirmed') transaction.completed = true
			await transaction.save()
		} catch (err) {
			if (err === 'SocketDisconnected') {
				console.error('Could not inform new transaction to main server: SocketDisconnected')
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
		const { txid, status, confirmations } = updtReceived
		try {
			const opid = await Receive.findOne({ txid }, { opid: true })
				.orFail().map(doc => doc.opid?.toHexString())
			assert(typeof opid == 'string')

			await this.emit('update_received_tx', { opid, status, confirmations })
			if (updtReceived.status == 'confirmed') {
				await Receive.updateOne({ txid }, { completed: true })
			}
		} catch (err) {
			if (err.code == 'TransactionConfirmed') {
				await Receive.updateOne({ txid }, { completed: true })
			} else if (err != 'SocketDisconnected') throw err
		}
	}

	/**
	 * Atualiza requests de withdraw recebidos do main server
	 * @param updtSent A atualização da atualização enviada
	 */
	public async updateSent(updtSent: UpdateSentTx) {
		const { opid, txid, status, timestamp, confirmations } = updtSent
		try {
			await this.emit('update_sent_tx', {
				opid: typeof opid == 'string' ? opid : opid.toHexString(),
				txid,
				status,
				confirmations,
				timestamp: new Date(timestamp).getTime(),
			})
			if (updtSent.status == 'confirmed') {
				await Transaction.updateOne({ opid }, { completed: true })
			}
		} catch (err) {
			if (err != 'SocketDisconnected') throw err
		}
	}
}
