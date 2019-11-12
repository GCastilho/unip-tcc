import socketIO = require('socket.io')
import { EventEmitter } from 'events'
import * as currencies from './_currencies'
import * as self from './_self'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export class CurrencyApi {
	// Módulos das currencies individuais (devem extender a common)
	protected _currencies: any = {
		nano: new currencies.Nano(),
		bitcoin: new currencies.Bitcoin()
	}

	/**
	 * Lista das currencies suportadas pela currencyApi
	 */
	public currencies = (() => {
		const __currencies: string[] = []
		Object.keys(this._currencies).forEach(currency => {
			__currencies.push(currency)
		})
		return __currencies
	})()

	/**
	 * EventEmmiter para eventos internos
	 */
	// private _events = new Events()

	/**
	 * EventEmmiter para eventos públicos
	 */
	events = new Events()

	/**
	 * Listener da currencyApi, para comunicação com os módulos externos
	 */
	private listener(port: number) {
		const io = socketIO(port)
		console.log('CurrencyApi listener is up on port', port)

		/**
		 * Ao receber uma conexão em '/<currency>' do socket, chama a função
		 * connection do módulo desta currency
		 */
		this.currencies.forEach(currency => {
			io.of(currency).on('connection', (socket: socketIO.Socket) => {
				this._currencies[currency].connection(socket)
			})
		})
	}

	/**
	 * Monitora os eventEmitters dos módulos individuais por eventos de
	 * 'new_transaction' e reemite-os no eventEmitter público da currencyApi
	 */
	private _new_transaction() {
		this.currencies.forEach(currency => {
			this._currencies[currency].events.on('new_transaction', (email, transaction) => {
				this.events.emit('new_transaction', email, currency, transaction)
			})
		})
	}

	/**
	 * Adiciona o request de criar accounts na checklist e chama o
	 * create_account_loop. Se nenhum account for especificada, será criado
	 * uma account de cada currency
	 * 
	 * @param userId O ObjectId do usuário
	 * @param currencies As currencies que devem ser criadas accounts
	 */
	create_accounts = self.create_accounts

	/**
	 * Adiciona o request de withdraw na checklist e chama o withdraw loop
	 * 
	 * @param email O email do usuário que a currency será retirada
	 * @param currency A currency que será retirada
	 * @param address O address de destino do saque
	 * @param amount A quantidade que será sacada
	 */
	withdraw = self.withdraw

	constructor() {
		// Inicia o listener
		this.listener(8085)
		
		// Inicializa o monitor de transações recebidas
		this._new_transaction()
	}

}

const singleton = new CurrencyApi()
export default singleton

// console.log(singleton)
