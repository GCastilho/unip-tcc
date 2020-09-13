import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import { ObjectId } from 'mongodb'
import Common from '../index'
import * as UserApi from '../../../../userApi'
import Transaction from '../../../../db/models/transaction'

/**
 * Retorna uma função que varre a collection checklist procurando por request
 * de cancelamento de saque para executar e depois executa o checklistCleaner
 *
 * Essa função também garante uma única instância do loop por curency para
 * impedir problemas de race condition
 */
export function cancell_withdraw_loop(this: Common) {
	/** Varíavel de contole das instâncias da cancell_withdraw */
	let looping = false

	const _cancell_withdraw = async () => {
		if (!this.isOnline || looping) return
		looping = true
		try {
			/** Cursor com os itens cancell_withdraw 'requested' da checklist */
			const checklist = Checklist.find({
				currency: this.name,
				command: 'cancell_withdraw',
				status: 'requested',
			}).cursor()

			let item: Ck
			while (this.isOnline && (item = await checklist.next())) {
				try {
					await this.emit('cancell_withdraw', item.opid)
					item.status = 'completed'
					await item.save()
					const user = await UserApi.findUser.byId(item.userId)
					await user.balanceOps.cancel(this.name, item.opid)
					await Transaction.deleteOne({ _id: item.opid })
					this.events.emit('update_sent_tx', item.userId, {
						opid: item.opid.toHexString(),
						status: 'cancelled'
					})
				} catch (err) {
					if (err.code == 'OperationNotFound') {
						item.status = 'completed'
						await item.save()
					} else {
						throw err
					}
				}
			}
			await this.checklistCleaner()
		} catch(err) {
			console.error('Error on cancell_withdraw_loop:', err)
		}
		looping = false
	}

	return _cancell_withdraw
}

export async function cancell_withdraw(this: Common, userId: ObjectId, opid: ObjectId) {
	try {
		const response = await this.emit('cancell_withdraw', opid)

		const user = await UserApi.findUser.byId(userId)
		// Pode dar throw em OperationNotFound (não tem handler)
		await user.balanceOps.cancel(this.name, opid)
		await Transaction.deleteOne({ _id: opid })

		return response
	} catch (err) {
		if (err == 'SocketDisconnected') {
			await Checklist.updateOne({
				opid,
				command: 'withdraw',
				status: 'requested'
			}, {
				status: 'cancelled'
			}).catch(err => {
				if (err.name != 'DocumentNotFoundError') throw err
			})

			await new Checklist({
				opid,
				userId,
				command: 'cancell_withdraw',
				currency: this.name,
				status: 'requested'
			}).save()

			return 'requested'
		} else {
			throw err
		}
	}
}
