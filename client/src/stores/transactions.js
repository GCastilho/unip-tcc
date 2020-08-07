import { writable } from 'svelte/store'
import axios from '../utils/axios'
import * as auth from './auth'

const { subscribe, set } = writable([])

/**
 * Exporta a store para permitir modificação da lista de transactions
 */
export { subscribe }

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
