import socket from 'socket.io'
import { Server } from 'http'
import * as Router from './router'
import './globalListeners'
import './emitters'

/**
 * Função de inicialização do websocket
 */
export = function(server: Server) {
	const io = socket(server)

	io.on('connection', function(socket) {
		console.log('Incoming socket connection')

		Router.use(socket)
	})
}
