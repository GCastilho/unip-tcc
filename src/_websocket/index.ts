import socket from 'socket.io'
import * as Router from './router'

export = function(server) {
	const io = socket(server)

	io.use((socket, next) => {
		if (!socket.handshake.headers.path)
			socket.handshake.headers.path = '/'
		next()
	})

	io.on('connection', function (socket) {
		console.log('Novo Cliente Conectado', socket.handshake.headers.path)

		socket.emit('connected', { status: 'online' })
		Router.use(socket.handshake.headers.path, socket)

		/**
		 * rotear o cliente para clientParh
		 *   na clientPath que deve ter um sistema que verifica a autenticação
		 * adicionar um listener para evento de novo path '_path'
		 *   essa função remove os eventListener e re-roteia (add _path de novo)
		 */
	})
}
