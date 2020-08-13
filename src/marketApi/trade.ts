import assert from 'assert'
// import { ObjectId } from 'mongodb'
// import TradeDoc from '../db/models/trade'
import type { Order } from '../db/models/order'

export default function trade(matchs: [Order, Order][]) {
	assert(
		matchs.length > 0 &&
		matchs.every(match =>
			match.length == 2 &&
			match[0]?.type == 'buy' && match[1]?.type == 'sell' ||
			match[1]?.type == 'buy' && match[0]?.type == 'sell'
		), `Fail to assert conditions on matchs: ${JSON.stringify(matchs)}`
	)
}
