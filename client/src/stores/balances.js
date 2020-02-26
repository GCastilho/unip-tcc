import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import * as transactions from '../utils/transactions'
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
		console.error('Error while fetching balances:', err)
	}
})

/**
 * Atualiza o balance locked ao receber uma nova transação
 */
addSocketListener('new_transaction', (currency, transaction) => {
	update(balances => {
		if (transaction.status === 'confirmed') {
			balances[currency].available += transaction.amount
		} else {
			balances[currency].locked += transaction.amount
		}
		return balances
	})
})

/**
 * Atualiza o balance availabe ao receber confirmação da transação
 */
addSocketListener('update_received_tx', async (currency, txUpdate) => {
	console.log(txUpdate)
	if (txUpdate.status !== 'confirmed') return
	try {
		const txInfo = await transactions.getByOpid(txUpdate.opid)
		update(balances => {
			balances[currency].available += +txInfo.amount
			balances[currency].locked -= +txInfo.amount
			return balances
		})
	} catch(err) {
		console.error('Error fetching tx_info:', err)
	}
})
