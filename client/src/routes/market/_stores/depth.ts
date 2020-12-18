import Store, { createStoreMap } from '../../../utils/store'
import { addSocketListener } from '../../../utils/websocket'
import type { MarketDepth } from '../depth'
import type { SuportedCurrencies } from '../../../../../src/libs/currencies'

class DepthStore extends Store<MarketDepth[]> {
	constructor(base: SuportedCurrencies, target: SuportedCurrencies) {
		super({
			apiUrl: '/market/depth',
			resetter: () => [],
			fetchParameters: { base, target },
		})

		/** Atualiza o array da store ao receber o evento depth_update */
		addSocketListener('depth_update', (depth: MarketDepth) => {
			this.update(columns => {
				const index = columns.findIndex(v => v.type === depth.type && v.price > depth.price)
				columns.splice(index, 0, depth)
				return columns
			})
		})
	}
}

export const getDepthStore = createStoreMap(DepthStore)
