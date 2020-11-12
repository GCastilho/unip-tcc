import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import type { PriceHistory } from '../../../interfaces/market'

const { subscribe, update, set } = writable<PriceHistory[]>([])

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/** Pega os dados do grafico e popula a store */
export async function fetch(currencies:string[]) {
	try {
		if (!currencies[0] || !currencies[1] || currencies[0] == currencies[1]) return
		currencies.sort()
		const { data } = await axios.get('/v1/market/candle', {
			params: { base: currencies[0], target: currencies[1] }
		})
		console.log(data)
		set(data)
	} catch (err) {
		console.error('Error fetching prices', err)
	}
}

/** Atualiza o array da store ao receber o evento depth_update */
/*addSocketListener('price_update', (price:PriceHistory) => {
	console.log(price)
	update(columns => {
		columns.push(price)
		return columns
	})
})
*/

set([{
	'startTime': 0,
	'open': 0,
	'high': 0,
	'low': 0,
	'close': 0,
	'volume': 0
}])


