/*
 * Ouve por eventos em módulos internos e os envia ao usuário relevante, caso
 * este esteja conectado
 */

import * as currencyApi from '../../currencyApi'
import * as connectedUsers from './connectedUsers'

currencyApi.events.on('new_transaction', (userId, currency, transaction) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('new_transaction', currency, transaction)
})

currencyApi.events.on('update_received_tx', (userId, currency, txUpdate) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('update_received_tx', currency, txUpdate)
})

currencyApi.events.on('update_sent_tx', (userId, currency, txUpdate) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('update_sent_tx', currency, txUpdate)
})
