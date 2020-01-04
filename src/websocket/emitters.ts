import User from '../userApi/user'
import currencyApi from '../currencyApi'
import * as connectedUsers from './connectedUsers'
import { TransactionInternal as Tx } from '../db/models/transaction'

/**
 * Ouve por eventos de new_transaction da currencyApi e os envia ao usuário,
 * caso ele esteja conectado
 */
currencyApi.events.on('new_transaction', (userId: User['id'], transaction: Tx) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('new_transaction', transaction)
})
