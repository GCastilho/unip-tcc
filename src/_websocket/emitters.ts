import User from '../userApi/user'
import currencyApi from '../currencyApi'
import * as connectedUsers from './connectedUsers'
import { TransactionInternal as Tx } from '../db/models/transaction'

currencyApi.events.on('new_transaction', (userId: User['id'], transaction: Tx) => {
	const socket = connectedUsers.get(userId)
	if (!socket) return // User is offline
	socket.emit('new_transaction', transaction)
})
