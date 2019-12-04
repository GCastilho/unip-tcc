import socketIO = require('socket.io')
import ss = require('socket.io-stream')
import { ObjectId } from 'bson'
import Common from '../index'
import Person from '../../../../db/models/person'
import userApi from '../../../../userApi'
import User from '../../../../userApi/user'
import { default as Tx, EMT, TxUpdt } from '../../../../db/models/transaction'

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
	socket.on('new_transaction', async (transaction: EMT, callback: Function) => {
		console.log('received new transaction', transaction)

		const { txid, account, amount, status, confirmations } = transaction
		const timestamp = new Date(transaction.timestamp)

		let user: User
		try {
			user = await userApi.findUser.byAccount(this.name, account)
		} catch (err) {
			if (err === 'UserNotFound') {
				return callback('No user found for this account')
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
				status: 'processing',
				confirmations,
				account,
				amount,
				timestamp
			}).save()

			await user.balanceOp.add(this.name, {
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
				await user.balanceOp.complete(this.name, opid)

			this.events.emit('new_transaction', user.id, transaction)
			callback(null, opid)
		} catch(err) {
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
					 * melhor é ter uma maneira de reolver
					 */
					try {
						/** Tenta cancelar a operação do usuário */
						await user.balanceOp.cancel(this.name, tx._id)
					} catch(err) {
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
					const {
						_id,
						txid,
						account,
						amount,
						timestamp,
						status,
						confirmations
					} = tx
					const transaction: EMT = {
						opid: _id.toHexString(),
						status,
						confirmations,
						txid,
						account,
						amount,
						timestamp: timestamp.getTime()
					}
					callback({ code: 'TransactionExists', transaction })
					await user.balanceOp.cancel(this.name, opid)
				}
			} else {
				console.error('Error processing new_transaction', err)
				callback({ code: 'InternalServerError' })
				await user.balanceOp.cancel(this.name, opid)
			}
		}
	})

	/**
	 * Processa requests de atualização de transações PENDENTES existentes
	 * Os únicos campos que serão atualizados são o status e o confirmations
	 */
	socket.on('transaction_update', async (txUpdate: TxUpdt, callback: Function) => {
		if (!txUpdate.opid) return callback({
			code: 'BadRequest',
			details: '\'opid\' needs to be informed to update a transaction'
		})

		const { opid, status, confirmations } = txUpdate

		/**
		 * Uma transação confirmada deve ter o campo de confirmações
		 * definido como undefined
		 */
		if (status === 'confirmed' && confirmations != undefined) return callback({
			code: 'BadRequest',
			message: 'A confirmation update must have \'confirmations\' field set as undefined'
		})

		try {
			const res = await Tx.findOneAndUpdate({
				_id: opid,
				status: 'pending'
			}, {
				$set: {
					status,
					confirmations
				}
			})
			if (!res) return callback({
				code: 'OperationNotFound',
				message: `No pending transaction with id: '${opid}' found`
			})

			const user = await userApi.findUser.byId(res.user)
			await user.balanceOp.complete(this.name, new ObjectId(opid))

			this.events.emit('transaction_update', user.id, txUpdate)
		} catch(err) {
			if (err === 'UserNotFound') {
				callback({ code: 'UserNotFound' })
			} else if (err === 'OperationNotFound') {
				callback({
					code: 'OperationNotFound',
					message: 'userApi could not find the requested operation'
				})
			} else {
				console.error('Error processing transaction_update', err)
				callback({ code: 'InternalServerError' })
			}
		}
	})

	/**
	 * Ouve por eventos vindos do método 'module' e os retransmite ao socket
	 * para serem enviados ao módulo externo
	 */
	this._events.on('module', (event: string, ...args: any) => {
		console.log('event', event)
		if (this.isOnline) {
			socket.emit(event, ...args)
		} else {
			/** O último argumento é o callback do evento */
			const callback: Function = args[args.length - 1]
			callback('Socket disconnected')
		}
	})
}
