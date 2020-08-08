import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import * as auth from './auth'

const { subscribe, set } = writable([])

/**
 * Exporta a store para permitir modificação da lista de transactions
 */
export { subscribe }

export const loadTx = async () => {
	auth.subscribe(async auth => {
		if (!auth) return
		try {
			const tx = await axios.get('/v1/user/transactions')
			console.log(tx.data)
			set(tx.data)
		} catch(err) {
			console.log(err)
		}
	})
}

addSocketListener('new_transaction', async (currency, transaction) => {
	console.log(transaction)
	loadTx()
})

addSocketListener('update_received_tx', async (currency, transaction) => {
	console.log(transaction)
	loadTx()
})

addSocketListener('update_sent_tx', async (currency, transaction) => {
	console.log(transaction)
	loadTx()
})
