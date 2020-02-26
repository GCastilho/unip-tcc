import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import * as transactions from '../stores/transactions'
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
 * Atualiza o Balance Locked ao receber uma nova transaction
 */
addSocketListener('new_transaction', (currency, transaction) => {
	transactions.update(tx => {
		tx.push(transaction)
		return tx
	})
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
	console.log(test)
	if (txUpdate.status === 'confirmed') {
		let txInfo = transactions.getTxByOpid(txUpdate.opid)
		if (txInfo) {
			update(balances => {
				balances[currency].available += +txInfo.amount
				balances[currency].locked -= +txInfo.amount
				return balances
			})
		} else {
			try {
				/** Pega os dados da transação pelo opid */
				txInfo = await emit('get_tx_info', txUpdate.opid)
				console.log(txInfo)
				/** Usa dados do amount pego no 'txInfo' para atualizar o saldo na tela */
				update(balances => {
					balances[currency].available += +txInfo.amount.$numberDecimal
					balances[currency].locked -= +txInfo.amount.$numberDecimal
					return balances
				})
			} catch(err) {
				console.error('Error while getting transaction info:', err)
			}
		}
	}
})
