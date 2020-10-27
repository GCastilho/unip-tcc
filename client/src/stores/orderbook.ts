import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { updateBalances } from './balances'
import { addSocketListener } from '../utils/websocket'
import type { MarketOrder, OrderUpdate } from '../../../interfaces/market'

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
		update(orders => [...orders, order])

		updateBalances(order.owning.currency, -order.owning.amount, order.owning.amount)
	} catch (err) {
		console.error('Error while sending the new order', err)
		throw err
	}
}

/**
 * Requisita da API e adiciona ao array uma ordem que não está
 * na store de ordens
 * @param opid O opid da ordem que não está na store
 */
async function fetchMissingOrder(opid: string) {
	try {
		const { data } = await axios.get(`/v1/orderbook/${opid}`)
		if (typeof data != 'object')
			throw new TypeError(`Invalid response type: expected 'object', got ${typeof data}`)

		console.log('Received missing order from API', data)

		// Type do data não necessariamente é o certo
		update(orders => [...orders, data])
	} catch (err) {
		console.error('Error fetching order', err)
	}
}

addSocketListener('order_update', (orderUpdt: OrderUpdate) => {
	console.log('Received orderbook update', orderUpdt)
	update(orders => {
		const index = orders.findIndex(v => v.opid == orderUpdt.opid)
		if (index) {
			const order = orders[index]

			if (orderUpdt.status == 'open') {
				order.owning.amount -= orderUpdt.completed.owning
				order.requesting.amount -= orderUpdt.completed.requesting

				// Reduz o locked da owning e aumenta o available do requesting
				updateBalances(order.owning.currency, 0, orderUpdt.completed.owning)
				updateBalances(order.requesting.currency, orderUpdt.completed.requesting, 0)
			} else {
				// Remove a ordem do array
				orders.splice(index, 1)

				if (orderUpdt.status == 'close') {
					// Reduz o locked da owning e aumenta o available do requesting no restante da ordem
					updateBalances(order.owning.currency, 0, order.owning.amount)
					updateBalances(order.requesting.currency, order.requesting.amount, 0)
				} else {
					// Restaura o locked e o available da owning
					updateBalances(order.owning.currency, order.owning.amount, -order.owning.amount)
				}
			}
			console.log('Order and balance updated successfully')
		} else {
			console.log(`No order found for ${orderUpdt.opid}, fetching from API...`)
			fetchMissingOrder(orderUpdt.opid)
		}
		return orders
	})
})
