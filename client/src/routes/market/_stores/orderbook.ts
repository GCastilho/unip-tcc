import { writable } from 'svelte/store'
import axios from '../../../utils/axios'
import { updateBalances } from '../../../stores/balances'
import { addSocketListener } from '../../../utils/websocket'
import type { OrderRequest, MarketOrder, OrderUpdate } from '../../../../../interfaces/market'

/** Store de TODAS as ordens do orderbook */
const { subscribe, update } = writable<MarketOrder[]>([])

export { subscribe }

/** Flag que indica se a função de fetch está sendo executada */
let inSync = false

/** Indica se o cliente está sincronizado com as transações do servidor */
let fullySync = false

/**
 * Exporta uma store em synchronized q indica se essa store está sincronizada
 * ou não; Essa store também mantém a variável fullySync atualizada
 */
const { subscribe: subFullySync, set: setFullySync } = writable(false)
export const synchronized = { subscribe: subFullySync }
subFullySync(v => fullySync = v)

/** Quantidade de transações presentes na store */
let storeLength = 0
subscribe(v => storeLength = v.length)

/**
 * Busca por mais 10 ordens caso a não esteja sincronizada com o servidor
 */
export async function fetch() {
	if (fullySync || inSync) return
	inSync = true

	try {
		/** @type {{data: any[]}} */
		const { data } = await axios.get('/v1/market/orderbook', {
			params: { skip: storeLength }
		})

		update(orders => {
			for (const order of data) {
				const index = orders.findIndex(v => v.opid === order.opid)
				if (index == -1)
					orders.push(order)
			}

			/**
			 * storeLength só é atualizada quando essa função retorna, então aqui ela
			 * ainda está com o length antigo
			 */
			if (storeLength == orders.length) setFullySync(true)
			return orders
		})
	} catch (err) {
		console.error('Error fetching orders', err)
	}

	inSync = false
}

export async function add(orderRequest: OrderRequest) {
	console.log('Sending new order to orderbook', orderRequest)
	try {
		const { data } = await axios.post('/v1/market/orderbook', orderRequest)
		const order: MarketOrder = {
			opid: data.opid,
			...orderRequest
		}

		console.log('Received orderbook response', data)
		update(orders => [...orders, order])

		updateBalances(order.owning.currency, -order.owning.amount, order.owning.amount)
	} catch (err) {
		console.error('Error while sending the new order', err)
		throw err
	}
}

/**
 * Requisita uma remoção de uma ordem do orderbook e em seguida remove-a do
 * orderbook local
 *
 * @param opid O opid da ordem que deve ser cancelada
 */
export async function remove(opid: string): Promise<void> {
	console.log(`Trying to cancell order '${opid}' from the orderbook`)
	try {
		await axios.delete(`/v1/market/orderbook/${opid}`)
		update(orders => {
			const idx = orders.findIndex(v => v.opid == opid)
			if (idx > -1) {
				orders.slice(idx, 1)
			} else {
				console.error(`Order with opid ${opid} was not found in the LOCAL orderbook AFTER the request was made`)
			}
			return orders
		})
		console.log(`Order ${opid} was cancelled from the orderbook`)
	} catch (err) {
		console.error('Error cancelling order', err)
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
		if (index >= 0) {
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
