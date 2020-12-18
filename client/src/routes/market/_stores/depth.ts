import Store from '../../../utils/store'
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

const map = new Map<string, DepthStore>()

/**
 * Retorna uma DepthStore das currencies requisitadas
 * @param base A currency Base desse par
 * @param target A currency Target desse par
 */
export default function getDepthStore(
	base: SuportedCurrencies,
	target: SuportedCurrencies,
) {
	if (base == target) throw new Error('Currency base must be different from Currency target')
	const mapKey = [base, target].join(',')
	let store = map.get(mapKey)
	if (!store) {
		store = new DepthStore(base, target)
		map.set(mapKey, store)
	}
	return store
}
