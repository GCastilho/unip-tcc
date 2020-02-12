import socket from 'socket.io'
import userApi from '../userApi'
import { Server } from 'http'
import * as connectedUsers from './connectedUsers'
import * as Router from './router'

// Configura os listeners globais
Router.GlobalListeners.add('disconnect', function(this: SocketIO.Socket, reason) {
	console.log('Socket disconnected:', reason)
	connectedUsers.remove(this.user?.id)
})

/**
 * Autentica a conexão de um socket conectado, inserindo referência à Users no
 * socket e atualizando a connectedUsers
 * @param sessionID O token de autenticação desse usuário
 * @param callback O callback de retorno ao cliente
 */
Router.GlobalListeners.add('authenticate', async function(this: SocketIO.Socket,
		sessionID: string,
		callback: (err: null|string, response?: string) => void
	) {
	if (typeof sessionID === 'string') {
		try {
			const user = await userApi.findUser.byCookie(sessionID)
			this.user = user
			connectedUsers.add(this)
			callback(null, 'authenticated')
		} catch(err) {
			this.user = undefined
			if (err === 'CookieNotFound' || err === 'UserNotFound') {
				callback('TokenNotFound')
			} else {
				console.error('Error while authenticating user:', err)
				callback('InternalServerError')
			}
		}
	} else {
		connectedUsers.remove(this.user?.id)
		this.user = undefined
		callback('TokenNotProvided')
	}
})

/**
 * Desautentica uma conexão de um socket conectado, removendo a referência à
 * Users no socket e atualizando a connectedUsers
 * @param callback O callback de retorno ao cliente
 */
Router.GlobalListeners.add('deauthenticate', function(this: SocketIO.Socket,
		callback: (err: null, response?: string) => void
	) {
		connectedUsers.remove(this.user?.id)
		this.user = undefined
		callback(null, 'deauthenticated')
})

/**
 * Função de inicialização do websocket
 */
export = function(server: Server) {
	const io = socket(server)

	/**
	 * Não se usa mais o path no header para o roteamento inicial, mas o
	 * roteador teria que ser refatorado para receber um header sem path
	 */
	io.use((socket, next) => {
		socket.handshake.headers.path = '/'
		next()
	})

	io.on('connection', function (socket) {
		console.log('Incoming connection at path:', socket.handshake.headers.path)

		Router.use(socket.handshake.headers.path, socket)
	})
}
