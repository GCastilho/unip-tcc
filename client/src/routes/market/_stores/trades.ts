import { ListStore } from '../../../utils/store'
import { addSocketListener } from '../../../utils/websocket'
import type { MarketTrade } from '../trades'

/** Store de TODAS as ordens do orderbook */
export default new class MarketTradeStore extends ListStore<MarketTrade> {
	constructor() {
		super({
			apiUrl: '/market/trades',
			userDataStore: true,
			key: 'opid',
		})

		// Adiciona a nova ordem de trade ao início do array de trades
		addSocketListener('new_trade', (trade: MarketTrade) => {
			console.log('Received new_trade', trade)
			this.update(trades => [trade, ...trades])
		})
	}
}
