import { onDestroy } from 'svelte'
import { writable } from 'svelte/store'
import { emit } from '../websocket'

export const { subscribe, update } = writable([])

/** 
 * Pega os dados da transação salva usando o opid
 */
export async function getTxByOpid(opid) {
	let transaction
	const unsubscribe = subscribe(transactions => {
		transaction = transactions.find(tx => tx.opid === opid)
	})
	if (!transaction) {
		try {
			transaction = await emit('get_tx_info', opid)
			update(tx => {
				tx.push(transaction)
				return tx
			})
		} catch(err) {
			console.error('Error while getting transaction info:', err)
		}
	}
	onDestroy(unsubscribe)
	return transaction
}