import socketIO = require('socket.io')
import Common from '../index'

export function connection(this: Common, socket: socketIO.Socket) {
	console.log('from connection', socket.nsp.name)
}
