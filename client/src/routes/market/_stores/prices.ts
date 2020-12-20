import Store, { MapStore } from '../../../utils/store'
import type { PriceHistory } from '../price/history'
import type { SuportedCurrencies } from '../../../../../src/libs/currencies'

const addSocketListener = MapStore.createEventDispatcher('price_history')

function storeResetter() {
	return [{
		'startTime': 0,
		'open': 0,
		'high': 0,
		'low': 0,
		'close': 0,
	}] as PriceHistory[] // Tem esse primeiro item pq o joão disse q dá erro sem esse obj inicial
}

/** Store do gráfico do histórico e preços */
class PriceHistoryStore extends Store<PriceHistory[]> {
	constructor(base: SuportedCurrencies, target: SuportedCurrencies) {
		super({
			apiUrl: '/market/price/history',
			resetter: storeResetter,
			fetchParameters: { base, target },
		})

		/** Atualiza o array da store ao receber o evento depth_update */
		addSocketListener([base, target], (price: PriceHistory) => {
			console.log('Received price_history', price)
			this.update(prices => {
				if (price.startTime == prices[prices.length - 1].startTime) {
					prices[prices.length - 1] = price
				} else {
					prices.push(price)
				}
				return prices
			})
		})
	}
}

export default new MapStore<PriceHistory[]>({
	store: PriceHistoryStore,
	resetter: storeResetter,
})
