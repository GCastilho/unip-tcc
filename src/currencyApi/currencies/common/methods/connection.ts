import socketIO = require('socket.io')
import ss = require('socket.io-stream')
import { ObjectId } from 'bson'
import Common from '../index'
import Person from '../../../../db/models/person'
import userApi from '../../../../userApi'
import User from '../../../../userApi/user'
import { default as Tx, Transaction } from '../../../../db/models/transaction'

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
	socket.on('new_transaction', async (transaction: Transaction, callback: Function) => {
		console.log('received new transaction', transaction)

		/** Os módulos mandam o timestamp em number */
		transaction.timestamp = new Date(transaction.timestamp)

		let user: User
		try {
			user = await userApi.findUser.byAccount(this.name, transaction.account)
		} catch (err) {
			if (err === 'UserNotFound') {
				return callback('No user found for this account')
			} else {
				return console.error('Error identifying user while processing new_transaction', err)
			}
		}

		const opid = new ObjectId()

		try {
			await user.balanceOp.add(this.name, {
				opid,
				type: 'transaction',
				amount: transaction.amount
			})

			await new Tx({
				user: user.id,
				txid: transaction.txid,
				type: 'receive',
				account: transaction.account,
				amount: transaction.amount,
				timestamp: transaction.timestamp
			}).save()

			await user.balanceOp.complete(this.name, opid)

			this.events.emit('new_transaction', user.id, transaction)

			callback(null, 'received')
		} catch(err) {
			if (err === 'OperationNotFound') {
				console.error(`Error seting operation '${opid}' to complete`, err)
			} else if (err.code === 11000 && err.keyPattern.txid) {
				// A transação já existe, retornar ela ao módulo externo
				const tx = await Tx.findOne({ txid: transaction.txid })
				callback({ message: 'TransactionExists', transaction: tx })
				await user.balanceOp.cancel(this.name, opid)
			} else {
				console.error('Error processing new_transaction', err)
				await user.balanceOp.cancel(this.name, opid)
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
