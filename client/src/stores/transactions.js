import { writable } from 'svelte/store'

export const { subscribe, update } = writable([])

/** 
 * Pega os dados da transação salva usando o opid
 */
export function getTxByOpid(opid) {
	let transaction
	subscribe(transactions => {
		transaction = transactions.find(tx => tx.opid === opid)
	})
	return transaction
}