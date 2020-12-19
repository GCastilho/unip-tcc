import Store, { createEventDispatcher, createStoreMap } from '../../../utils/store'
import type { MarketDepth } from '../depth'
import type { SuportedCurrencies } from '../../../../../src/libs/currencies'

/**
 * Chama o callback para esse evento apenas se ele for do par de currencies
 * informado
 */
const addSocketListener = createEventDispatcher('depth_update')

class DepthStore extends Store<MarketDepth[]> {
	constructor(base: SuportedCurrencies, target: SuportedCurrencies) {
		super({
			apiUrl: '/market/depth',
			resetter: () => [],
			fetchParameters: { base, target },
		})

		/**
		 * Atualiza o array da store ao receber o evento depth_update desse par de
		 * currencies
		 */
		addSocketListener([base, target], (depth: MarketDepth) => {
			this.update(columns => {
				const index = columns.findIndex(v => v.type === depth.type && v.price > depth.price)
				columns.splice(index, 0, depth)
				return columns
			})
		})
	}
}

export const getDepthStore = createStoreMap(DepthStore)
