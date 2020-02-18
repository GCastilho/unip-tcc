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
	} catch(err) {
		console.error('Error while fething balances:', err)
	}
})

/**
 * Todo: testar se o evento esta funcionando
 */
addSocketListener('new_transaction', (res) => {
	console.log(res)
})

addSocketListener('update_received_tx', (res) => {
	console.log(res)
})