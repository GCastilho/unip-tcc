import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { updateBalances } from './balances'
import { addSocketListener } from '../utils/websocket'
import type { MarketTrade } from '../../../interfaces/market'

/** Store de TODAS as ordens do orderbook */
const { subscribe, update } = writable<MarketTrade[]>([])

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
		const { data } = await axios.get('/v1/market/trades', {
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
