const WS = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')
const axios = require('axios')
const rpc = require('./rpc')
const wallet = '1396F74639C8912595BDE10C766461EBBEF1EE696794DA4807B197AB140C1949'
const stdAccount = 'nano_1cm99iqoqh53c464jz98u1qdzi37z5934rcz6byfdhkyhsq5aqqcqtt9dioi'

/** Keep track if there was a conn error to prevent error span */
let connErr = false

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

/** As soon as we connect, subscribe to block confirmations */
ws.onopen = () => {
	/** Reseta o status de erro de conexão */
	connErr = false
	console.log('Websocket connection open')
	const confirmation_subscription = {
		'action': 'subscribe',
		'topic': 'confirmation',
		'options': {
			/** coloca todas as contas locais dentro do filtro para serem observadas se realizaram uma operacao */
			'all_local_accounts': true,
			//"accounts": [array de contas que vao ser observadas alem das contas locais]			
		}
	}
	ws.send(JSON.stringify(confirmation_subscription))
}

ws.onerror = function(event) {
	if (event.error.code === 'ECONNREFUSED' ||
		event.error.code === 'ECONNRESET') {
		/** Faz com que a mensagem de erro de conexão apareça apenas uma vez */
		if (!connErr) {
			connErr = true
			console.log('Error connecting to nano websocket')
		}
	} else {
		console.error('WebSocket error observed:', event)
	}
}

/**
 * The node sent us a message
 * 
 * @todo Tratar os dados e enviar para o servidor e banco de dados
 */
ws.onmessage = msg => {
	data_json = JSON.parse(msg.data)
	if (data_json.message.block.subtype === 'send') {
		axios.post('http://localhost:50000/transaction', {
			message: {
				block: {
					link_as_account,
					link
				},
				amount,
			},
			time
		} = data_json)
	}else if (data_json.message.block.subtype === 'receive') {
		rpc.command(send = {
			'action': 'send',
			'wallet': wallet,
			'source': data_json.message.account,
			'destination': stdAccount,
			'amount': data_json.message.amount
		}).catch(() => {console.log('redirect nano to main account:erro')})
	}
}
