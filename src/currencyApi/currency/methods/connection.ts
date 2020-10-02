import socketIO from 'socket.io'
import ss from 'socket.io-stream'
import Currency from '../index'
import Person from '../../../db/models/person'

export function connection(this: Currency, socket: socketIO.Socket) {
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

	for (const event of this._events.eventNames()) {
		// Pula os eventos que não são do módulo externo
		switch (event) {
			case('connected'):
			case('disconnected'):
			case('emit'):
				continue
		}
		socket.on(event, (...args) => {
			// @ts-expect-error A tipagem desses eventos é feita separadamente
			this._events.emit(event, ...args)
		})
	}

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
	 * Ouve por eventos vindos do método 'module' e os retransmite ao socket
	 * para serem enviados ao módulo externo
	 */
	this._events.on('emit', (event, args, callback) => {
		console.log('event', event)
		if (this.isOnline) {
			socket.emit(event, ...args, callback)
		} else {
			callback('SocketDisconnected')
		}
	})
}
