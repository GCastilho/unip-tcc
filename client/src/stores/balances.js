import { writable } from 'svelte/store'
import { emit, addSocketListener, removeSocketListner } from '../websocket'
import * as auth from '../stores/auth'

const { subscribe, set, update } = writable({})

/**
 * Exporta a store para permitir modificação do saldo de fora
 */
export { subscribe, set, update }

/** Indica se autenticado ou não (valor da store de auth) */
let authenticated = false

/**
 * Atualiza o saldo da store de balances com os dados do servidor
 * 
 * Caso o socket esteja desconectado adiciona um listener para tentar de novo
 * assim que a conexão for estabelecida
 */
async function fetchBalance() {
	if (!authenticated) return
	try {
		const balances = await emit('fetch_balances')
		set(balances)
	} catch(err) {
		if (err === 'SocketDisconnected') {
			return addSocketListener('connect', fetchBalance)
		} else {
			console.error('Error while fething balances:', err)
		}
	}
	removeSocketListner('connect', fetchBalance)
}

/**
 * Ao autenticar com o socket atualiza o saldo com o valor do servidor
 */
auth.subscribe(auth => {
	authenticated = auth
	fetchBalance()
})
