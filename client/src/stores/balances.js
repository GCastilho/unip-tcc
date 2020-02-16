import { writable } from 'svelte/store'
import { emit } from '../websocket'
import * as auth from '../stores/auth'

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
