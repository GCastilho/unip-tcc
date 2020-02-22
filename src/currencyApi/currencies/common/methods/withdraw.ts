import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import Transaction, { TxSend, UpdtSent } from '../../../../db/models/transaction'
import userApi from '../../../../userApi'
import Common from '../index'

/**
 * Retorna uma função que varre a collection da checklist e executa os requests
 * de saque requisitados, depois disso executa o checklistCleaner
 * 
 * Essa função também garante uma única instância do loop por curency para
 * impedir problemas de race condition
 */
export function withdraw(this: Common) {
	/** Varíavel de contole das instâncias da withdraw */
	let looping = false

	this._events.on('update_sent_tx', async (txUpdate: UpdtSent, callback: Function) => {
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
		try {
			await tx.save()
		} catch(err) {
			if (err.name === 'ValidationError') {
				return callback({
					code: 'ValidationError',
					message: 'Mongoose failed to validate the document after the update',
					details: err
				})
			} else {
				callback({ code: 'InternalServerError' })
				throw err
			}
		}

		if (txUpdate.status === 'confirmed') {
			try {
				const user = await userApi.findUser.byId(tx.user)
				await user.balanceOps.complete(this.name, tx._id)
			} catch(err) {
				if (err === 'OperationNotFound') {
					return callback({
						code: 'OperationNotFound',
						message: `UserApi could not find operation ${tx._id}`
					})
				} else if (err === 'UserNotFound') {
					return callback({
						code: 'UserNotFound',
						message: `UserApi could not find user ${tx.user}`
					})
				} else {
					callback({ code: 'InternalServerError' })
					throw err
				}
			}
		}

		callback(null, `${txUpdate.opid} updated`)
		this.events.emit('update_sent_tx', tx.user, txUpdate)
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
					opid:    tx._id.toHexString(),
					account: tx.account,
					amount:  tx.amount.toFullString()
				}

				try {
					await this.emit('withdraw', transaction)
					console.log('sent withdraw request', transaction)

					item.status = 'completed'
					await item.save()
				} catch (err) {
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
