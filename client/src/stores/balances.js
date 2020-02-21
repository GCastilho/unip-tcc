import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import { emit, addSocketListener } from '../websocket'

const { subscribe, set, update } = writable({})

/**
 * Exporta a store para permitir modificação do saldo de fora
 */
export { subscribe, set, update }

/**
 * Ao autenticar com o socket atualiza o saldo com o valor do servidor
 */
auth.subscribe(async auth => {
	if (!auth) return
	try {
		const balances = await emit('fetch_balances')
		set(balances)
		console.log(balances)
	} catch(err) {
		console.error('Error while fething balances:', err)
	}
})

/**
 * Atualiza o Balance Locked ao receber uma nova transaction
 */
addSocketListener('new_transaction', (name, transaction) => {
	console.log(transaction)
	update(balances => {
		let { available, locked } = balances[name]
		locked += transaction.amount
		balances[name] = {available, locked }
		return balances
	})
})

addSocketListener('update_received_tx', (name, txUpdate) => {
	console.log(name)
	console.log(txUpdate)
})