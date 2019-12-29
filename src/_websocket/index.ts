import socket from 'socket.io'
import userApi from '../userApi'
import { Server } from 'http'
import * as connectedUsers from './connectedUsers'
import * as Router from './router'

/*
 * Confirgura os listeners globais
 */
Router.GlobalListeners.add('disconnect', function (this: SocketIO.Socket, reason) {
	console.log('Socket disconnected:', reason)
	connectedUsers.remove(this.user?.id)
})

Router.GlobalListeners.add('authentication', function (this: SocketIO.Socket, sessionId?: string) {
	if (typeof sessionId === 'string') {
		autenticateUser(this, sessionId)
	} else {
		connectedUsers.remove(this.user?.id)
		this.user = undefined
	}
})

/**
 * Autentica um socket caso ela seja de um usuário válido, inserindo referência
 * à Users no socket e atualizando a connectedUsers
 * @param socket O socket da conexão que tentará ser autenticada
 * @param sessionId O sessionId do usuário
 */
async function autenticateUser(socket: SocketIO.Socket, sessionId?: string) {
	if (!sessionId) return
	try {
		const user = await userApi.findUser.byCookie(sessionId)
		socket.user = user
		connectedUsers.add(socket)
	} catch(err) {
		socket.user = undefined
		if (err !== 'CookieNotFound' && err !== 'UserNotFound')
			console.error('Error while authenticating user:', err)
	}
}

/**
 * Função de inicialização do websocket
 */
export = function(server: Server) {
	const io = socket(server)

	/**
	 * Autentica o usuário antes de continuar
	 * 
	 * Se a autenticação for bem sucedida, haverá uma referência à classe User
	 * em socket.user, em caso de falha essa propriedade terá valor undefined
	 */
	io.use(async (socket, next) => {
		const sessionId = socket.handshake.headers.authentication
		await autenticateUser(socket, sessionId)

		if (!socket.handshake.headers.path)
			socket.handshake.headers.path = '/'
		next()
	})

	io.on('connection', function (socket) {
		console.log('Incoming connection at path:', socket.handshake.headers.path)

		Router.use(socket.handshake.headers.path, socket)
	})
}
