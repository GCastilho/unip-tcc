import axios from 'axios'
import { writable } from 'svelte/store'
import { addSocketListener } from '../../../utils/websocket'
import type { PriceRequest } from '../price'
import type { PriceUpdate } from '../../../../../interfaces/market'

const { subscribe, update, set } = writable<PriceRequest>({
	buyPrice: 0,
	sellPrice: Infinity,
	currencies: [] as unknown as PriceRequest['currencies']
})

/** Exporta o subscribe para essa variável se ruma store */
export { subscribe }

/** Pega os dados do grafico e popula a store */
export async function fetch(currencies: PriceRequest['currencies']) {
	try {
		if (!currencies[0] || !currencies[1] || currencies[0] == currencies[1]) return
		currencies.sort()
		const { data } = await axios.get<PriceRequest>('/market/price', {
			params: { base: currencies[0], target: currencies[1] }
		})
		console.log('market price fetch:', data)
		set(data)
	} catch (err) {
		console.error('Error fetching prices', err)
	}
}

/** Atualiza o array da store ao receber o evento price_update */
addSocketListener('price_update', (newPrice: PriceUpdate) => {
	console.log('price_update', newPrice)
	update(price => {
		if (newPrice.type == 'buy') {
			price.buyPrice = newPrice.price
		} else {
			price.sellPrice = newPrice.price
		}
		return price
	})
})
