import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import * as transactions from '../utils/transactions'
import { addSocketListener } from '../utils/websocket'
import axios from '../utils/axios'

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
		const balanceObj = await axios.get('/v1/user/balances')
		let balances = {}
		for (const balance of Object.entries(balanceObj.data)) {
			balances[balance[0]] = {
				available: +balance[1].available,
				locked: +balance[1].locked
			}
		}
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
 * Atualiza o balance availabe ao receber confirmação de transação recebida
 */
addSocketListener('update_received_tx', async (currency, txUpdate) => {
	console.log('update_received_tx:', currency, txUpdate)
	if (txUpdate.status !== 'confirmed') return
	try {
		const txInfo = await transactions.getByOpid(txUpdate.opid)
		update(balances => {
			balances[currency].available += txInfo.amount
			balances[currency].locked -= txInfo.amount
			return balances
		})
	} catch(err) {
		console.error('Error fetching tx_info:', err)
	}
})

/**
 * Atualiza o balance locked ao confirmar envio da transação
 */
addSocketListener('update_sent_tx', async (currency, txSent) => {
	console.log('update_sent_tx:', currency, txSent)
	if (txSent.status !== 'confirmed') return
	try {
		const txInfo = await transactions.getByOpid(txSent.opid)
		update(balances => {
			balances[currency].locked -= txInfo.amount
			return balances
		})
	} catch(err) {
		console.error('Error fetching tx_info:', err)
	}
})
