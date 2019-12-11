import socketIO = require('socket.io')
import { EventEmitter } from 'events'
import * as currencies from './currencies'
import * as self from './self'
import User from '../userApi/user'
import { TransactionInternal as Tx } from '../db/models/transaction'

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
	private __listener(port: number) {
		const io = socketIO(port)
		console.log('CurrencyApi listener is up on port', port)

		/**
		 * Ao receber uma conexão em '/<currency>' do socket, chama a função
		 * connection do módulo desta currency
		 */
		this.currencies.forEach(currency => {
			io.of(currency).on('connection', (socket: socketIO.Socket) => {
				console.log(`Connected to the '${currency}' module`)
				this._currencies[currency].connection(socket)
			})
		})
	}

	/**
	 * Monitora os eventEmitters dos módulos individuais por eventos de
	 * 'new_transaction' e reemite-os no eventEmitter público da currencyApi
	 */
	private __new_transaction() {
		this.currencies.forEach(currency => {
			this._currencies[currency].events
				.on('new_transaction', (userId: User['id'], transaction: Tx ) => {
					this.events.emit('new_transaction', userId, currency, transaction)
			})
		})
	}

	/**
	 * Um array de objetos com informações detalhadas sobre as currencies
	 * suportadas pela api
	 * 
	 * O objeto contém as propriedades 'name' e 'code'
	 */
	currenciesDetailed: Object[] = (() => {
		const __currencies: Object[] = []
		this.currencies.forEach(currency => {
			const { name, code } = this._currencies[currency]
			__currencies.push({
				name,
				code
			})
		})
		return __currencies
	})()

	/**
	 * Adiciona o request de criar accounts na checklist e chama o método
	 * create_account das currencies solicitadas. Se nenhum account for
	 * especificada, será criado uma account de cada currency
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
		this.__listener(8085)
		
		// Inicializa o monitor de transações recebidas
		this.__new_transaction()
	}
}
