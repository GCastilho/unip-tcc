// import { ObjectId } from 'mongodb'
// import TradeDoc from '../db/models/trade'
import type { Order } from '../db/models/order'

export default function trade(matchs: [Order, Order][]) {
	if (
		matchs.some(([maker, taker]) =>
			maker.type != 'buy' && taker.type != 'sell' ||
			taker.type != 'buy' && maker.type != 'sell'
		)
	) throw new Error(`Some orders are not of type 'buy' and 'sell' on: ${matchs}`)
}
