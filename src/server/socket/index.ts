import socket, { Socket } from 'socket.io'
import { Server } from 'http'
import Session from '../../db/models/session'
import * as marketApi from '../../marketApi'
import * as connectedUsers from './connectedUsers'
import './emitters'

/**
 * Handler da conexão de um cliente com o socket
 * @param socket O Socket do cliente que acabou de se conectar
 */
function onSocketConnection(socket: Socket) {
	console.log('Incoming socket connection')

	socket.on('disconnect', function(this: SocketIO.Socket, reason) {
		console.log('Socket disconnected:', reason)
		connectedUsers.remove(this)
	})

	/**
	 * Autentica a conexão de um socket conectado, inserindo referência à Users no
	 * socket e atualizando a connectedUsers
	 * @param token O token de autenticação desse usuário
	 * @param callback O callback de retorno ao cliente
	 */
	socket.on('authenticate', async function(this: SocketIO.Socket,
		token: string,
		callback: (err: null | string, response?: string) => void
	) {
		if (typeof token === 'string') {
			try {
				const session = await Session.findOne({ token }, { userId: true })
				if (!session) throw 'TokenNotFound'
				this.userId = session.userId.toHexString()
				connectedUsers.add(this)
				callback(null, 'authenticated')
			} catch (err) {
				this.userId = undefined
				if (err === 'TokenNotFound' || err === 'UserNotFound') {
					callback('TokenNotFound')
				} else {
					console.error('Error while authenticating user:', err)
					callback('InternalServerError')
				}
			}
		} else {
			connectedUsers.remove(this)
			this.userId = undefined
			callback('InvalidToken')
		}
	})

	/**
	 * Desautentica uma conexão de um socket conectado, removendo a referência à
	 * Users no socket e atualizando a connectedUsers
	 * @param callback O callback de retorno ao cliente
	 */
	socket.on('deauthenticate', function(this: SocketIO.Socket,
		callback: (err: null, response?: string) => void
	) {
		connectedUsers.remove(this)
		this.userId = undefined
		callback(null, 'deauthenticated')
	})
}

/**
 * Função de inicialização do websocket
 */
export default function(server: Server) {
	const io = socket(server)

	io.on('connection', onSocketConnection)

	// Transmite o evento para todos os sockets conectados
	marketApi.events.on('price_update', priceUpdate => {
		io.emit('price_update', priceUpdate)
	})
}
