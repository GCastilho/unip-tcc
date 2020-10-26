import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { updateBalances } from './balances'
import type { MarketOrder } from '../../../interfaces/market'

interface Order extends MarketOrder {
	opid: string
}

/** Store de TODAS as ordens do orderbook */
const { subscribe, update } = writable<Order[]>([])

export { subscribe }

export async function add(marketOrder: MarketOrder) {
	try {
		const { data } = await axios.post('/v1/market/orderbook', marketOrder)
		const order: Order = {
			opid: data.opid,
			...marketOrder
		}

		console.log('adding new order to orderbook', order)
		update(orders => [order, ...orders])

		updateBalances(order.owning.currency, -order.owning.amount, order.owning.amount)
	} catch (err) {
		console.error('Error while sending the new order', err)
		throw err
	}
}
