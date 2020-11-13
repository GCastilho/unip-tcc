import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import type { MarketDepth } from '../../../interfaces/market'

const { subscribe, update, set } = writable<MarketDepth[]>([])

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/** Pega os dados do grafico e popula a store */
export async function fetch(currencies:string[]) {
	try {
		if (!currencies[0] || !currencies[1] || currencies[0] == currencies[1]) return
		currencies.sort()
		const { data } = await axios.get('/v1/market/orderbook/depth', {
			params: { base: currencies[0], target: currencies[1] }
		})
		console.log(data)
		set(data)
	} catch (err) {
		console.error('Error fetching orders', err)
	}
}

/** Atualiza o array da store ao receber o evento depth_update */
addSocketListener('depth_update', (depth:MarketDepth) => {
	update(columns => {
		const index = columns.findIndex(v => v.type === depth.type && v.price > depth.price)
		columns.splice(index, 0, depth)
		return columns
	})
})

