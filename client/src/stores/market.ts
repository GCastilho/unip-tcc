import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { updateBalances } from './balances'

const { subscribe, update, set } = writable([])

export { subscribe }

export async function orderbook(marketOrder) {
	try {
		const { data } = await axios.post('/v1/market/orderbook', marketOrder)
		console.log(data)
	} catch (error) {
		console.error(error)
	}
}
