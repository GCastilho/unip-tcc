import WS from 'ws'
import { Nano } from '../index'
// eslint-disable-next-line
const ReconnectingWebSocket = require('reconnecting-websocket')

export function nanoWebSocket(this: Nano) {
	/**
	 * Create a reconnecting WebSocket. In this example, we wait a maximum of
	 * 2 seconds before retrying
	 */
	const ws = new ReconnectingWebSocket('ws://[::1]:57000', [], {
		WebSocket: WS,
		connectionTimeout: 10000,
		maxRetries: 100000,
		maxReconnectionDelay: 2000,
		minReconnectionDelay: 10 // if not set, initial connection will take a few seconds by default
	})

	/** Keep track if this is the first websocket connection */
	let firstConnection = true

	/** As soon as we connect, subscribe to block confirmations */
	ws.onopen = () => {
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
	}

	/**
	 * The node sent us a message
	 *
	 * @todo Tratar os dados e enviar para o servidor e banco de dados
	 */
	ws.onmessage = async msg => {
		const data: Nano.WebSocket = JSON.parse(msg.data)
		if (data.message.block.subtype != 'receive') return

		try {
			this.processTransaction(data)
		} catch(err) {
			console.error('Error while processing socket message', err)
		}
	}

	ws.onerror = (event: any) => {
		if (event.error.code === 'ECONNREFUSED' ||
			event.error.code === 'ECONNRESET'
		) {
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
	}
}
