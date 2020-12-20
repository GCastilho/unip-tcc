import Store, { createEventDispatcher, MapStore } from '../../../utils/store'
import type { PriceRequest } from '../price'
import type { PriceUpdate } from '../../../../../interfaces/market'
import type { SuportedCurrencies } from '../../../../../src/libs/currencies'

type MarketPrice = Omit<PriceRequest, 'currencies'>

const addSocketListener = createEventDispatcher('price_update')

function storeResetter() {
	return {
		buyPrice: 0,
		sellPrice: Infinity,
	}
}

class PriceRequestStore extends Store<MarketPrice> {
	constructor(base: SuportedCurrencies, target: SuportedCurrencies) {
		super({
			apiUrl: '/market/price',
			fetchParameters: { base, target },
			resetter: storeResetter,
		})

		/** Atualiza o preço da store ao receber o evento price_update */
		addSocketListener([base, target], (newPrice: PriceUpdate) => {
			console.log('price_update', newPrice)
			this.update(price => {
				if (newPrice.type == 'buy') {
					price.buyPrice = newPrice.price
				} else {
					price.sellPrice = newPrice.price
				}
				return price
			})
		})
	}
}

export default new MapStore<MarketPrice>({
	store: PriceRequestStore,
	resetter: storeResetter,
})
