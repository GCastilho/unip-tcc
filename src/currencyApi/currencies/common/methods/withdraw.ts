import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import Transaction, { TxSend, UpdtSent } from '../../../../db/models/transaction'
import userApi from '../../../../userApi'
import Common from '../index'

/**
 * Retorna uma função que varre a collection da checklist procurando por
 * comandos de withdraw que foram requisitados
 * 
 * Essa função tem um garbage collector em seu closure para limpar o command
 * 'withdraw'
 * 
 * Essa função também garante que haverá uma única instância varrendo a
 * collection (por instância da classe) para evitar problemas de race condition
 */
export function withdraw(this: Common) {
	/**
	 * Controla as instâncias do withdraw_loop
	 */
	let looping: boolean = false

	this._events.on('connected', () => {
		_withdraw()
	})

	this._events.on('disconnected', () => {
		looping = false
	})

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
				} else {
					callback({ code: 'InternalServerError' })
					throw err
				}
			}
		}

		callback(null, `${txUpdate.opid} updated`)
		this.events.emit('update_sent_tx', tx.user, txUpdate)
	})

	/**
	 * Remove os itens do array de withdraw que tem status 'completed'
	 * Remove (seta como undefined) todos os arrays de withdraw vazios
	 * Chama a garbage_collector para o withdraw
	 */
	const garbage_collector = async () => {
		// Remove os itens do array de withdraw que tem status 'completed'
		const resArray = await Checklist.updateMany({
			[`commands.withdraw.${this.name}`]: { $exists: true }
		}, {
			$pull: {
				[`commands.withdraw.${this.name}`]: { status: 'completed' }
			}
		})

		// Nenhum item foi removido de nenhum array
		if (!resArray.nModified) return

		// Procura por arrays de withdraw vazios e os deleta
		const resWithdraw = await Checklist.updateMany({
			[`commands.withdraw.${this.name}`]: { $size: 0 }
		}, {
			$unset: {
				[`commands.withdraw.${this.name}`]: true
			}
		})

		// Nenhum array de withdraw foi deletado
		if (!resWithdraw.nModified) return

		await this.garbage_collector('withdraw')
	}

	/**
	 * Percorre a checklist procurando por requests de withdraw 
	 * com status 'requested' e os executa
	 */
	const withdraw_loop = async () => {
		const checklist = Checklist.find({
			[`commands.withdraw.${this.name}`]: { $exists: true }
		}).cursor()

		let item: Ck
		while ( looping && (item = await checklist.next()) ) {
			const { commands: { withdraw } } = item

			for (const request of withdraw[this.name]) {
				if (request.status != 'requested') continue

				const tx = await Transaction.findById(request.opid)
				if (!tx) throw `Withdraw error: Transaction ${request.opid} not found!`

				const transaction: TxSend = {
					opid:      tx._id.toHexString(),
					account:   tx.account,
					amount:    tx.amount.toFullString()
				}

				try {
					await this.module('withdraw', transaction)
					console.log('sent withdraw request', transaction)

					request.status = 'completed'
					await item.save()
				} catch (err) {
					if (err === 'SocketDisconnected') {
						request.status = 'requested'
						await item.save()
					} else if (err.code === 'OperationExists') {
						request.status = 'completed'
						await item.save()
					} else {
						throw err
					}
				}
			}
		}
	}

	const _withdraw = async () => {
		if (looping || !this.isOnline) return
		looping = true
		try {
			await withdraw_loop()
			await garbage_collector()
		} catch(err) {
			console.error('Error on withdraw_loop', err)
		}
		looping = false
	}

	return _withdraw
}
