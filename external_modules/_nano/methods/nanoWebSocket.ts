import WS from 'ws'
import ReconnectingWebSocket from 'reconnecting-websocket'
import { Transaction } from '../../_common'
import Account from '../../_common/db/models/account'

const wallet = process.env.WALLET
const stdAccount = process.env.SEND_ACCOUNT
if (!wallet) throw 'WALLET needs to be informed as environment variable'
if (!stdAccount) throw 'SEND_ACCOUNT needs to be informed as environment variable'

export function nanoWebSocket() {
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
	
	ws.onerror = function(event: any) {
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
		const data: Nano.WebSocket = JSON.parse(msg.data)
	
		// Ignora transações recebidas na account de change
		if (data.message.account === stdAccount) return
		if (data.message.block.link_as_account === stdAccount) return
	
		if (data.message.block.subtype === 'send') {
			rpc.convertToNano(data.message.amount).then(amount=> {
				const transaction: Transaction = {
					txid: data.message.block.link,
					account: data.message.block.link_as_account,
					amount: parseInt(amount),
					timestamp: new Date(data.time)
				}
				// Eviar para o servidor principal
			}) // Falta um catch
		} else if (data.message.block.subtype === 'receive') {
			Account.findOne({ account: data.message.account }).then(account => {
				if(!account) return
				rpc.command({
					action: 'send',
					wallet: wallet,
					source: data.message.account,
					destination: stdAccount,
					amount: data.message.amount
				}).catch(() => {
					console.error('redirect nano to main account:erro')
				})
			})
		}
	}
}

