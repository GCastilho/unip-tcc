import Checklist, { Checklist as Ck } from '../../../../db/models/checklist'
import Transaction, { TxSend, UpdtSended } from '../../../../db/models/transaction'
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

	this._events.on('update_sended_tx', async (updtSended: UpdtSended, callback: Function) => {
		const tx = await Transaction.findById(updtSended.opid)
		if (!tx) return callback({
			code: 'NotFound',
			message: '\'opid\' not found'
		})

		/**
		 * Uma transação confirmada deve ter o campo de confirmações
		 * definido como null
		 */
		if (updtSended.status === 'confirmed' && updtSended.confirmations != null) return callback({
			code: 'BadRequest',
			message: 'A confirmation update must have \'confirmations\' field set as null'
		})

		// Atualiza a transação no database
		tx.txid = updtSended.txid
		tx.status = updtSended.status
		tx.timestamp = new Date(updtSended.timestamp)
		tx.confirmations = updtSended.confirmations ? updtSended.confirmations : undefined
		await tx.save()

		this.events.emit('update_sended_tx', tx.user, updtSended)
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
					/**
					 * Uma transação não enviada tem status 'processing', ela
					 * deveria ser enviada com esse status, não como 'pending'.
					 * Ou seja, usat tx.status, não um valor hardcoded
					 */
					status:    'pending',
					account:   tx.account,
					amount:    tx.amount,
					type:      tx.type,
					timestamp: tx.timestamp.getTime()
				}

				try {
					await this.module('withdraw', transaction)
					console.log('sended transaction', transaction)

					request.status = 'completed'
					await item.save()
				} catch (err) {
					if (err.code === 'OperationExists') {
						request.status = 'completed'
						await item.save()
					} else if (err != 'SocketDisconnected')
						throw err
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
