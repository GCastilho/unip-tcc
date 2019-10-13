const WS = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')

/**
 * Create a reconnecting WebSocket. In this example, we wait a maximum of
 * 2 seconds before retrying
 */
const ws = new ReconnectingWebSocket(('ws://[::1]:57000'), [], {
	WebSocket: WS,
	connectionTimeout: 10000,
	maxRetries: 100000,
	maxReconnectionDelay: 2000,
	minReconnectionDelay: 10 // if not set, initial connection will take a few seconds by default
})

/** As soon as we connect, subscribe to block confirmations */
ws.onopen = () => {
	console.log('websocket listening')
	const confirmation_subscription = {
		"action": "subscribe",
		"topic": "confirmation",
		"options": {
			/** coloca todas as contas locais dentro do filtro para serem observadas se realizaram uma operacao */
			"all_local_accounts": true,
			//"accounts": [array de contas que vao ser observadas alem das contas locais]			
			}
	}
	ws.send(JSON.stringify(confirmation_subscription))
}

ws.onerror = function(event) {
	console.error("WebSocket error observed:", event)
}

/**
 * The node sent us a message
 * 
 * @todo Tratar os dados e enviar para o servidor e banco de dados
 */
ws.onmessage = msg => {
	console.log(msg.data)
	data_json = JSON.parse(msg.data)
	
	console.log ('Confirmed', data_json.message.hash)
}
