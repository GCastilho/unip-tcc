import WS from 'ws'
import ReconnectingWebSocket from 'reconnecting-websocket'
import type { Nano } from '../index'
import type { AxiosError } from 'axios'

const nanoSocketUrl = process.env.NANO_SOCKET_URL || 'ws://[::1]:57000'

export function nanoWebSocket(this: Nano) {
	const ws = new ReconnectingWebSocket(nanoSocketUrl, [], {
		WebSocket: WS,
		connectionTimeout: 10000,
		maxRetries: 100000,
		maxReconnectionDelay: 2000, // Wait max of 2 seconds before retrying
	})

	/** Keep track if this is the first websocket connection */
	let firstConnection = true

	/** As soon as we connect, subscribe to block confirmations */
	ws.addEventListener('open', () => {
		console.log('Websocket connection open')
		firstConnection = false
		this._events.emit('rpc_connected')
		ws.send(JSON.stringify({
			action: 'subscribe',
			topic: 'confirmation',
			options: {
				/** Coloca todas as contas locais no filtro para serem observadas */
				all_local_accounts: true,
				//accounts: [array de contas extras que serão observadas]
			}
		}))
	})

	/**
	 * The node sent us a message
	 */
	ws.addEventListener('message', msg => {
		const data: Nano.WebSocket = JSON.parse(msg.data)
		if (data.message.block.subtype != 'receive') return

		this.processTransaction(data).catch(err => {
			console.error('Error while processing socket message', err)
		})
	})

	ws.addEventListener('error', event => {
		const error = event.error as AxiosError
		if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
			if (firstConnection) {
				/**
				 * Não emite rpc_disconnected caso seja a primeira conexão
				 * com o websocket
				 */
				firstConnection = false
				console.error('Error connecting to nano websocket')
			} else if (this.nodeOnline) {
				console.error('Disconnected from nano websocket')
				this._events.emit('rpc_disconnected')
			}
		} else {
			console.error('WebSocket error observed:', event)
		}
	})
}
