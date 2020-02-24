import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import { emit, addSocketListener } from '../websocket'

const { subscribe, set, update } = writable({})

let transactions = []

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
 * Atualiza o Balance Locked ao receber uma nova transaction
 */
addSocketListener('new_transaction', (currency, transaction) => {
	transactions.push(transaction)
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
 * Após receber a confirmação da transação ele atualiza o Balance Available
 */
addSocketListener('update_received_tx', async (currency, txUpdate) => {
	console.log(txUpdate)
	if (txUpdate.status === 'confirmed') {
		if (transactions.some(transaction => transaction.opid === txUpdate.opid)) {
			update(balances => {
				const txInfo = transactions.filter(transaction => transaction.opid === txUpdate.opid)
				balances[currency].available += txInfo[0].amount
				balances[currency].locked -= txInfo[0].amount
				return balances
			})
		} else {
			try {
				/** Pega os dados da transação pelo opid */
				const txInfo = await emit('get_tx_info', txUpdate.opid)
				console.log(txInfo)
				/** Usa dados do amount pego no 'txInfo' para atualizar o saldo na tela */
				update(balances => {
					balances[currency].available += txInfo.amount
					balances[currency].locked -= txInfo.amount
					return balances
				})
			} catch(err) {
				console.error('Error while getting transaction info:', err)
			}
		}
	}
})
