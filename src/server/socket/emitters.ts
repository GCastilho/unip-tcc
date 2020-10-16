/*
 * Ouve por eventos em módulos do sistema e os envia ao usuário relevante, caso
 * este esteja conectado
 */

import * as currencyApi from '../../currencyApi'
import * as connectedUsers from './connectedUsers'

currencyApi.events.on('new_transaction', (userId, currency, transaction) => {
	const set = connectedUsers.get(userId.toHexString())
	if (!set) return // User is offline
	set.forEach(socket => socket.emit('new_transaction', currency, transaction))
})

currencyApi.events.on('update_received_tx', (userId, currency, txUpdate) => {
	const set = connectedUsers.get(userId.toHexString())
	if (!set) return // User is offline
	set.forEach(socket => socket.emit('update_received_tx', currency, txUpdate))
})

currencyApi.events.on('update_sent_tx', (userId, currency, txUpdate) => {
	const set = connectedUsers.get(userId.toHexString())
	if (!set) return // User is offline
	set.forEach(socket => socket.emit('update_sent_tx', currency, txUpdate))
})
