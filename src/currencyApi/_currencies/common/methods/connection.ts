import socketIO = require('socket.io')
import ss = require('socket.io-stream')
import Common from '../index'
import Person = require('../../../../db/models/person')

export function connection(this: Common, socket: socketIO.Socket) {
	/**
	 * Emite um 'connected' no event emitter interno para informar aos outros
	 * métodos que o socket se conectou
	 */
	socket.on('connect', () => {
		this._events.emit('connected')
	})

	/**
	 * Emite um 'disconnected' no event emitter interno para informar aos outros
	 * métodos que o socket se desconectou
	 */
	socket.on('disconnect', () => {
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

	console.log('from connection', socket.nsp.name)
}
