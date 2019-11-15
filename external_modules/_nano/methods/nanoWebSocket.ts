import WS from 'ws'
import ReconnectingWebSocket from 'reconnecting-websocket'
import Account from '../../_common/db/models/account'
import { Nano } from '../index'

export function nanoWebSocket(this: Nano) {
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
			event.error.code === 'ECONNRESET' &&
			!connErr
		) {
			/** Faz com que a mensagem de erro de conexão apareça apenas uma vez */
			connErr = true
			console.error('Error connecting to nano websocket')
		} else {
			console.error('WebSocket error observed', event)
		}
	}
	
	/**
	 * The node sent us a message
	 * 
	 * @todo Tratar os dados e enviar para o servidor e banco de dados
	 */
	ws.onmessage = async msg => {
		const data: Nano.WebSocket = JSON.parse(msg.data)
	
		// Ignora transações recebidas na account de change
		if (data.message.account === this.stdAccount) return
		if (data.message.block.link_as_account === this.stdAccount) return
	
		try {
			if (data.message.block.subtype === 'send') {
				const amount = await this.rpc.convertToNano(data.message.amount)
				await this.module('new_transaction', {
					txid: data.message.block.link,
					account: data.message.block.link_as_account,
					amount: parseInt(amount),
					timestamp: new Date(data.time)
				})
			} else if (data.message.block.subtype === 'receive') {
				const account = Account.findOne({
					account: data.message.account
				})
				if(!account) return

				this.rpc.command({
					action: 'send',
					wallet: this.wallet,
					source: data.message.account,
					destination: this.stdAccount,
					amount: data.message.amount
				}).catch(err => {
					console.error('Error redirecting to nano stdAccount', err)
				})
			}
		} catch(err) {
			console.error('Error while processing socket message', err)
		}
	}
}

