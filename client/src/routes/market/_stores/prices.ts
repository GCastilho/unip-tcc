import axios from 'axios'
import { writable } from 'svelte/store'
import { addSocketListener } from '../../../utils/websocket'
import type { PriceHistory } from '../price/history'

const { subscribe, update, set } = writable<PriceHistory[]>([{
	'startTime': 0,
	'open': 0,
	'high': 0,
	'low': 0,
	'close': 0,
}] as PriceHistory[]) // as está aq pq o joão disse q dá erro sem esse obj inicial

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/** Pega os dados do grafico e popula a store */
export async function fetch(currencies: PriceHistory['currencies']) {
	try {
		if (!currencies[0] || !currencies[1] || currencies[0] == currencies[1]) return
		currencies.sort()
		const { data } = await axios.get<PriceHistory[]>('/market/price/history', {
			params: { base: currencies[0], target: currencies[1] }
		})
		console.log('price history fetch:', data)
		set(data)
	} catch (err) {
		console.error('Error fetching prices', err)
	}
}

/** Atualiza o array da store ao receber o evento depth_update */
addSocketListener('price_history', (price: PriceHistory) => {
	console.log('Received price_history', price)
	update(prices => {
		if (price.startTime == prices[prices.length - 1].startTime) {
			prices[prices.length - 1] = price
		} else {
			prices.push(price)
		}
		return prices
	})
})
