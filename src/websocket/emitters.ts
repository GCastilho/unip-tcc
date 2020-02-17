import User from '../userApi/user'
import currencyApi from '../currencyApi'
import * as connectedUsers from './connectedUsers'
import { TxReceived, UpdtReceived } from '../db/models/transaction'
import { SuportedCurrencies as SC } from '../currencyApi/currencyApi'

/**
 * Ouve por eventos de new_transaction da currencyApi e os envia ao usuário,
 * caso ele esteja conectado
 */
currencyApi.events.on('new_transaction', (userId: User['id'], currency: SC, transaction: TxReceived) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('new_transaction', currency, transaction)
})

/**
 * Ouve por eventos de update_received_tx da currencyApi e os envia ao usuário,
 * caso ele esteja conectado
 */
currencyApi.events.on('update_received_tx', (userId: User['id'], currency: SC, txUpdate: UpdtReceived) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('update_received_tx', currency, txUpdate)
})
