import socketIO = require('socket.io')
import ss = require('socket.io-stream')
import Common from '../index'
import Person from '../../../../db/models/person'
import { Transaction } from '../../../../db/models/currencies/common'

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
			if (!currencies) return
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
		const person = await Person.findOneAndUpdate({
			[`currencies.${this.name}.accounts`]: transaction.account
		}, {
			$push: { [`currencies.${this.name}.received`]: transaction },
			$inc: { [`currencies.${this.name}.balance`]: transaction.amount }
		})

		if (!person) return callback('No user found for this account')

		this.events.emit('new_transaction', person.email, transaction)

		callback(null, 'received')
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
