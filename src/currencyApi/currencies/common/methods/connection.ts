import socketIO from 'socket.io'
import ss = require('socket.io-stream')
import { ObjectId, Decimal128 } from 'mongodb'
import Common from '../index'
import Person from '../../../../db/models/person'
import * as userApi from '../../../../userApi'
import User from '../../../../userApi/user'
import { default as Tx, TxReceived, UpdtReceived } from '../../../../db/models/transaction'

export function connection(this: Common, socket: socketIO.Socket) {
	/*
	 * Essa função é executada (pela currencyApi) quando o socket se conecta
	 */
	this.isOnline = true
	this._events.emit('connected')

	/**
	 * Emite um 'disconnected' no event emitter interno para informar aos outros
	 * métodos que o socket se desconectou
	 */
	socket.on('disconnect', () => {
		console.log(`Disconnected from the '${this.name}' module`)
		this.isOnline = false
		this._events.removeAllListeners('emit')
		this._events.emit('disconnected')
	})

	/**
	 * Retorna uma stream de strings de todas as accounts dos clientes, uma
	 * account por chunk
	 */
	ss(socket).on('get_account_list', (stream: NodeJS.WritableStream) => {
		const person = Person.find({}, {
			[`currencies.${this.name}`]: 1
		}).lean().cursor()

		person.on('data', ({ currencies }) => {
			if (Object.keys(currencies).length === 0) return
			currencies[this.name].accounts.forEach((account: string) => {
				stream.write(account)
			})
		})

		person.on('end', () => stream.end())
	})

	/**
	 * Processa novas transações desta currency, atualizando o balanço do
	 * usuário e emitindo um evento de 'new_transaction' no EventEmitter público
	 */
	socket.on('new_transaction', async (transaction: TxReceived, callback: (err: any, opid?: string) => void) => {
		console.log('received new transaction', transaction)

		const { txid, account, amount, status, confirmations } = transaction
		const timestamp = new Date(transaction.timestamp)

		if (Number.isNaN(+amount)) return callback({
			code: 'BadRequest',
			message: 'Amount is not numeric'
		})

		if (+amount < 0) return callback({
			code: 'BadRequest',
			message: 'Amount can not be a negative number'
		})

		let user: User
		try {
			user = await userApi.findUser.byAccount(this.name, account)
		} catch (err) {
			if (err === 'UserNotFound') {
				return callback({
					code: 'UserNotFound',
					message: 'No user found for this account'
				})
			} else {
				return console.error('Error identifying user while processing new_transaction', err)
			}
		}

		/**
		 * ObjectId dessa transação na collection de transactions e
		 * identificador dessa operação para o resto do sistema
		 */
		const opid = new ObjectId()

		try {
			const tx = await new Tx({
				_id: opid,
				user: user.id,
				txid,
				type: 'receive',
				currency: this.name,
				status: 'processing',
				confirmations,
				account,
				amount: Decimal128.fromNumeric(amount, this.supportedDecimals),
				timestamp
			}).save()

			await user.balanceOps.add(this.name, {
				opid,
				type: 'transaction',
				amount
			})

			tx.status = status
			await tx.save()

			/**
			 * TODO: balanceOp.add ter um argumento opcional
			 * 'status' = 'pending' | 'complete', que se for o segundo adiciona
			 * uma operação confirmada
			 */
			if (status === 'confirmed')
				await user.balanceOps.complete(this.name, opid)

			this.events.emit('new_transaction', user.id, {
				status:        tx.status,
				currency:      tx.currency,
				txid:          tx.txid,
				account:       tx.account,
				amount:       +tx.amount.toFullString(),
				type:          tx.type,
				confirmations: tx.confirmations,
				timestamp:     tx.timestamp
			})
			callback(null, opid.toHexString())
		} catch (err) {
			if (err.code === 11000 && err.keyPattern.txid) {
				// A transação já existe
				const tx = await Tx.findOne({ txid })
				if (!tx) {
					throw `Error finding transaction '${txid}' that SHOULD exist`
				} else if (tx.status === 'processing') {
					/*
					 * Houve um erro entre adicionar a tx e a update do status,
					 * restaurar o database para status inicial e tentar de novo
					 *
					 * Esse tipo de erro não deve ocorrer a menos que ocorra
					 * uma falha no database (no momento específico) ou falha de
					 * energia, slá. O q importa é que PODE ocorrer, então o
					 * melhor é ter uma maneira de resolver
					 */
					try {
						/** Tenta cancelar a operação do usuário */
						await user.balanceOps.cancel(this.name, tx._id)
					} catch (err) {
						if (err != 'OperationNotFound')
							throw err
					}
					/** Remove a transação do database */
					await tx.remove()
					/**
					 * Chama essa função novamente com os mesmos parâmetros
					 *
					 * Ao emitir o evento no socket ele também será
					 * transmitido ao módulo externo, mas, como o módulo externo
					 * não tem (não devería ter) um handler para um evento de
					 * socket que ele mesmo emite, não deve dar problema
					 */
					socket.emit('new_transaction', transaction, callback)
				} else {
					// A transação já existe, retornar ela ao módulo externo
					const transaction: TxReceived = {
						opid:          tx._id.toHexString(),
						txid:          tx.txid,
						account:       tx.account,
						amount:        tx.amount.toFullString(),
						status:        tx.status,
						confirmations: tx.confirmations,
						timestamp:     tx.timestamp.getTime()
					}
					console.log('Rejecting existing transaction:', transaction)
					callback({ code: 'TransactionExists', transaction })
					await user.balanceOps.cancel(this.name, opid).catch(err => {
						if (err != 'OperationNotFound') throw err
					})
				}
			} else if (err.name === 'ValidationError') {
				callback({
					code: 'ValidationError',
					message: 'Mongoose failed to validate the document',
					details: err
				})
			} else {
				console.error('Error processing new_transaction:', err)
				callback({ code: 'InternalServerError' })
				/**
				 * Restaura o database ao estado original
				 *
				 * Não se sabe em que estágio ocorreu um erro para cair aqui,
				 * então a operação pode ou não ter sido criada, por esse motivo
				 * o erro de 'OperationNotFound' está sendo ignorando
				 *
				 * Entretando, um outro erro é um erro de fato e deve terminar
				 * a execução do programa para evitar potencial dano
				 */
				try {
					await Tx.findByIdAndDelete(opid)
					await user.balanceOps.cancel(this.name, opid)
				} catch (err) {
					if (err != 'OperationNotFound')
						throw err
				}
			}
		}
	})

	/**
	 * Processa requests de atualização de transações PENDENTES existentes
	 * Os únicos campos que serão atualizados são o status e o confirmations
	 */
	socket.on('update_received_tx', async (txUpdate: UpdtReceived, callback: (err: any, res?: string) => void) => {
		if (!txUpdate.opid) return callback({
			code: 'BadRequest',
			message: '\'opid\' needs to be informed to update a transaction'
		})

		console.log('received update_received_tx', txUpdate)

		const { opid, status, confirmations } = txUpdate

		try {
			const tx = await Tx.findOne({
				_id: opid,
				status: 'pending'
			})
			if (!tx) return callback({
				code: 'OperationNotFound',
				message: `No pending transaction with id: '${opid}' found`
			})

			tx.status = status
			tx.confirmations = txUpdate.status === 'confirmed' ? undefined : confirmations
			await tx.validate()

			if (status === 'confirmed') {
				const user = await userApi.findUser.byId(tx.user)
				await user.balanceOps.complete(this.name, new ObjectId(opid))
			}

			await tx.save()
			callback(null, `${txUpdate.opid} updated`)
			this.events.emit('update_received_tx', tx.user, txUpdate)
		} catch (err) {
			if (err === 'UserNotFound') {
				callback({
					code: 'UserNotFound',
					message: `UserApi could not find the user for the operation '${txUpdate.opid}'`
				})
			} else if (err === 'OperationNotFound') {
				callback({
					code: 'OperationNotFound',
					message: `userApi could not find operation '${txUpdate.opid}'`
				})
			} else if (err.name === 'ValidationError') {
				callback({
					code: 'ValidationError',
					message: 'Mongoose failed to validate the document after the update',
					details: err
				})
			} else if (err.name === 'CastError') {
				callback({
					code: 'CastError',
					message: err.message
				})
			} else {
				console.error('Error processing update_received_tx', err)
				callback({ code: 'InternalServerError' })
			}
		}
	})

	/**
	 * Ouve por requests de atualização de transações enviada e os retransmite
	 * no eventEmitter interno
	 */
	socket.on('update_sent_tx', (updtSended, callback) => {
		console.log('received update_sent_tx:', updtSended)
		this._events.emit('update_sent_tx', updtSended, callback)
	})

	/**
	 * Ouve por eventos vindos do método 'module' e os retransmite ao socket
	 * para serem enviados ao módulo externo
	 */
	this._events.on('emit', (event: string, ...args: any) => {
		console.log('event', event)
		if (this.isOnline) {
			socket.emit(event, ...args)
		} else {
			/** O último argumento é o callback do evento */
			const callback: Function = args[args.length - 1]
			callback('SocketDisconnected')
		}
	})
}
