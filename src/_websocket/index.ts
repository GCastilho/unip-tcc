import socket from 'socket.io'
import userApi from '../userApi'
import * as connectedUsers from './connectedUsers'
import * as Router from './router'

export = function(server) {
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

		Router.use(socket.handshake.headers.path, socket, generalListenersSetup)
	})
}

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
		if (err !== 'CookieNotFound' && err !== 'UserNotFound')
			console.error('Error while authenticating user:', err)
	}
}

/**
 * Coloca no socket listeners que de gerenciamento que devem existir em todas
 * as conexões (eles são removidos junto com todos os outros na mudança de path)
 * @param socket O socket de conexão (não precisa ser de um usuário autenticado)
 */
function generalListenersSetup(socket: SocketIO.Socket) {
	socket.on('disconnect', (reason) => {
		console.log('Socket disconnected:', reason)
		connectedUsers.remove(socket.user?.id)
	})

	if (socket.user) {
		// Se ESTÁ autenticado
		socket.once('deauthenticate', () => {
			connectedUsers.remove(socket.user?.id)
			socket.user = undefined
		})
	} else {
		// Se NÃO ESTÁ autenticado
		socket.once('authenticate', (sessionId: string) => {
			autenticateUser(socket, sessionId)
		})
	}
}
