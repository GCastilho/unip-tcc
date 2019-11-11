import socketIO = require('socket.io')
import { CurrencyApi } from '../index'

export function listener(this: CurrencyApi, port: number) {
	const io = socketIO(port)
	console.log('CurrencyApi listener is up on port', port)

	Object.keys(this.currencies).forEach(currency => {
		io.of(currency).on('connection', (socket: socketIO.Socket) => {
			this.currencies[currency].connection(socket)
		})
	})
}
