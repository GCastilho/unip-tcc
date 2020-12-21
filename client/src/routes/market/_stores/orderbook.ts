import axios from 'axios'
import balances from '../../../stores/balances'
import { ListStore } from '../../../utils/store'
import { addSocketListener } from '../../../utils/websocket'
import type { MarketOrder } from '../orderbook'
import type { OrderRequest, OrderUpdate } from '../../../../../interfaces/market'

/** Store de TODAS as ordens do orderbook */
export default new class MarketOrdersStore extends ListStore<MarketOrder> {
	constructor() {
		super({
			apiUrl: '/market/orderbook',
			userDataStore: true,
			key: 'opid',
		})

		addSocketListener('order_update', (orderUpdt: OrderUpdate) => {
			console.log('Received orderbook update', orderUpdt)
			this.update(orders => {
				const index = orders.findIndex(v => v.opid == orderUpdt.opid)
				if (index >= 0) {
					const order = orders[index]

					if (orderUpdt.status == 'open') {
						order.owning.amount -= orderUpdt.completed.owning
						order.requesting.amount -= orderUpdt.completed.requesting

						// Reduz o locked da owning e aumenta o available do requesting
						balances.updateBalances(order.owning.currency, 0, orderUpdt.completed.owning)
						balances.updateBalances(order.requesting.currency, orderUpdt.completed.requesting, 0)
					} else {
						// Remove a ordem do array
						orders.splice(index, 1)

						if (orderUpdt.status == 'close') {
							// Reduz o locked da owning e aumenta o available do requesting no restante da ordem
							balances.updateBalances(order.owning.currency, 0, order.owning.amount)
							balances.updateBalances(order.requesting.currency, order.requesting.amount, 0)
						} else {
							// Restaura o locked e o available da owning
							balances.updateBalances(order.owning.currency, order.owning.amount, -order.owning.amount)
						}
					}
					console.log('Order and balance updated successfully')
				} else {
					console.log(`No order found for ${orderUpdt.opid}, fetching from API...`)
					this.fetchMissingOrder(orderUpdt.opid)
				}
				return orders
			})
		})
	}

	/**
	 * Requisita da API e adiciona ao array uma ordem que não está
	 * na store de ordens
	 * @param opid O opid da ordem que não está na store
	 */
	private async fetchMissingOrder(opid: string) {
		try {
			const { data } = await axios.get<MarketOrder>(`/market/orderbook/${opid}`)
			if (typeof data != 'object')
				throw new TypeError(`Invalid response type: expected 'object', got ${typeof data}`)

			console.log('Received missing order from API', data)

			// Type do data não necessariamente é o certo
			this.update(orders => [...orders, data])
		} catch (err) {
			console.error('Error fetching order', err)
		}
	}

	/**
	 * Faz o request de trade à API e adiciona uma nova ordem ao orderbook
	 * @param orderRequest O requests de trade que será adicionado
	 */
	public async add(orderRequest: OrderRequest) {
		console.log('Sending new order to orderbook', orderRequest)
		try {
			const { data } = await axios.post<{ opid: string }>(this.apiUrl, orderRequest)
			const order: MarketOrder = {
				opid: data.opid,
				timestamp: Date.now(),
				...orderRequest
			}

			console.log('Received orderbook response', data)
			this.update(orders => [...orders, order])

			balances.updateBalances(order.owning.currency, -order.owning.amount, order.owning.amount)
		} catch (err) {
			console.error('Error while sending the new order', err)
			throw err
		}
	}

	/**
	 * Requisita uma remoção de uma ordem do orderbook e em seguida remove-a do
	 * orderbook local
	 *
	 * @param opid O opid da ordem que deve ser cancelada
	 */
	public async remove(opid: string): Promise<void> {
		console.log(`Trying to cancell order '${opid}' from the orderbook`)
		try {
			await axios.delete(`${this.apiUrl}/${opid}`)
			this.update(orders => {
				const idx = orders.findIndex(v => v.opid == opid)
				if (idx > -1) {
					orders.slice(idx, 1)
				} else {
					console.error(`Order with opid ${opid} was not found in the LOCAL orderbook AFTER the request was made`)
				}
				return orders
			})
			console.log(`Order ${opid} was cancelled from the orderbook`)
		} catch (err) {
			console.error('Error cancelling order', err)
			throw err
		}
	}
}
