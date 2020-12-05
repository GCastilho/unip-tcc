import { writable } from 'svelte/store'
import axios from '../../../utils/axios'
import { addSocketListener } from '../../../utils/websocket'
import type { PriceRequest, PriceUpdate } from '../../../../../interfaces/market'

const { subscribe, update, set } = writable<PriceRequest>({})

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/** Pega os dados do grafico e popula a store */
export async function fetch(currencies:string[]) {
	try {
		if (!currencies[0] || !currencies[1] || currencies[0] == currencies[1]) return
		currencies.sort()
		const { data } = await axios.get('/v1/market/price', {
			params: { base: currencies[0], target: currencies[1] }
		})
		console.log(data)
		set(data)
	} catch (err) {
		console.error('Error fetching prices', err)
	}
}

/** Atualiza o array da store ao receber o evento price_update */
addSocketListener('price_update', (newPrice:PriceUpdate) => {
	console.log(newPrice)
	update(price => {
		if (newPrice.type == 'buy') {
			price.buyPrice = newPrice.price
		} else {
			price.sellPrice = newPrice.price
		}
		return price
	})
})
