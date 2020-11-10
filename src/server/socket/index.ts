import Session from '../../db/models/session'
import * as marketApi from '../../marketApi'
import * as currencyApi from '../../currencyApi'
import * as connectedUsers from './connectedUsers'
import { events as tradeEvents } from '../../marketApi/trade'
import type { Server, Socket } from 'socket.io'

export default function socketHandler(io: Server) {
	io.on('connection', function(socket) {
		console.log('Incoming socket connection')

		socket.on('disconnect', function(this: Socket, reason) {
			console.log('Socket disconnected:', reason)
			connectedUsers.remove(this)
		})

		/**
		 * Autentica a conexão de um socket conectado, inserindo referência à Users no
		 * socket e atualizando a connectedUsers
		 * @param token O token de autenticação desse usuário
		 * @param callback O callback de retorno ao cliente
		 */
		socket.on('authenticate', async function(this: Socket,
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
		socket.on('deauthenticate', function(this: Socket,
			callback: (err: null, response?: string) => void
		) {
			connectedUsers.remove(this)
			this.userId = undefined
			callback(null, 'deauthenticated')
		})
	})

	// Transmite eventos para todos os sockets conectados

	marketApi.events.on('price_update', priceUpdate => {
		io.emit('price_update', priceUpdate)
	})

	marketApi.events.on('depth_update', depth => {
		io.emit('depth_update', depth)
	})

	// Transmite eventos para os sockets autenticados

	currencyApi.events.on('new_transaction', (userId, currency, transaction) => {
		connectedUsers.get(userId)?.emit('new_transaction', currency, transaction)
	})

	currencyApi.events.on('update_received_tx', (userId, currency, txUpdate) => {
		connectedUsers.get(userId)?.emit('update_received_tx', currency, txUpdate)
	})

	currencyApi.events.on('update_sent_tx', (userId, currency, txUpdate) => {
		connectedUsers.get(userId)?.emit('update_sent_tx', currency, txUpdate)
	})

	marketApi.events.on('order_update', (userId, orderUpdt) => {
		connectedUsers.get(userId)?.emit('order_update', orderUpdt)
	})

	tradeEvents.on('new_trade', (userId, trade) => {
		connectedUsers.get(userId)?.emit('new_trade', trade)
	})
}
