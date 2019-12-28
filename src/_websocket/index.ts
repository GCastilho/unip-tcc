import socket from 'socket.io'
import userApi from '../userApi'
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
		try {
			/**
			 * @todo Adicionar o usuário a um Map de usuários conectados
			 * (identificá-lo por User.id, que é o _id do doc dele)
			 */
			const user = await userApi.findUser.byCookie(sessionId)
			socket.user = user
		} catch(err) {
			if (err !== 'CookieNotFound' && err !== 'UserNotFound') throw err
		}

		if (!socket.handshake.headers.path)
			socket.handshake.headers.path = '/'
		next()
	})

	io.on('connection', function (socket) {
		console.log('Incoming connection at path:', socket.handshake.headers.path)

		socket.emit('connected', { status: 'online' })
		Router.use(socket.handshake.headers.path, socket)
	})
}
