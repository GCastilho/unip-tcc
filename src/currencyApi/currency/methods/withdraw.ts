import Checklist, { Checklist as Ck } from '../../../db/models/checklist'
import Transaction from '../../../db/models/transaction'
import * as userApi from '../../../userApi'
import Currency from '../index'
import type { TxSend, UpdtSent } from '../../../../interfaces/transaction'

/**
 * Retorna uma função que varre a collection da checklist e executa os requests
 * de saque requisitados, depois disso executa o checklistCleaner
 *
 * Essa função também garante uma única instância do loop por curency para
 * impedir problemas de race condition
 */
export function withdraw(this: Currency) {
	/** Varíavel de contole das instâncias da withdraw */
	let looping = false

	this._events.on('update_sent_tx', async (txUpdate: UpdtSent, callback: (err: any, res?: string) => void) => {
		if (!txUpdate.opid) return callback({
			code: 'BadRequest',
			message: '\'opid\' needs to be informed to update a transaction'
		})

		try {
			const tx = await Transaction.findById(txUpdate.opid)
			if (!tx) return callback({
				code: 'OperationNotFound',
				message: `No pending transaction with id: '${txUpdate.opid}' found`
			})

			// Atualiza a transação no database
			tx.txid = txUpdate.txid
			tx.status = txUpdate.status
			tx.timestamp = new Date(txUpdate.timestamp)
			tx.confirmations = txUpdate.status === 'confirmed' ? undefined : txUpdate.confirmations

			await tx.save()

			if (txUpdate.status === 'confirmed') {
				const user = await userApi.findUser.byId(tx.userId)
				await user.balanceOps.complete(this.name, tx._id)
			}

			callback(null, `${txUpdate.opid} updated`)
			this.events.emit('update_sent_tx', tx.userId, txUpdate)
		} catch(err) {
			if (err === 'OperationNotFound') {
				callback({
					code: 'OperationNotFound',
					message: `UserApi could not find operation '${txUpdate.opid}'`
				})
			} else if (err === 'UserNotFound') {
				callback({
					code: 'UserNotFound',
					message: `UserApi could not find the user for the operation '${txUpdate.opid}'`
				})
			} else if (err.name === 'CastError') {
				callback({
					code: 'CastError',
					message: err.message
				})
			} else if (err.name === 'ValidationError') {
				callback({
					code: 'ValidationError',
					message: 'Mongoose failed to validate the document after the update',
					details: err
				})
			} else {
				callback({ code: 'InternalServerError' })
				console.error('Error processing update_sent_tx', err)
			}
		}
	})

	const _withdraw = async () => {
		if (looping || !this.isOnline) return
		looping = true
		try {
			/** Cursor com os itens withdraw 'requested' da checklist */
			const checklist = Checklist.find({
				currency: this.name,
				command: 'withdraw',
				status: 'requested'
			}).cursor()

			let item: Ck
			while (this.isOnline && (item = await checklist.next())) {
				const tx = await Transaction.findById(item.opid)
				if (!tx) throw `Withdraw error: Transaction ${item.opid} not found!`

				const transaction: TxSend = {
					opid:    tx.id,
					account: tx.account,
					amount:  tx.amount.toFullString()
				}

				try {
					await this.emit('withdraw', transaction)
					console.log('sent withdraw request', transaction)

					item.status = 'completed'
					await item.save()
				} catch(err) {
					if (err === 'SocketDisconnected') {
						item.status = 'requested'
						await item.save()
					} else if (err.code === 'OperationExists') {
						item.status = 'completed'
						await item.save()
					} else {
						throw err
					}
				}
			}

			await this.checklistCleaner()
		} catch(err) {
			console.error('Error on withdraw_loop', err)
		}
		looping = false
	}

	return _withdraw
}
