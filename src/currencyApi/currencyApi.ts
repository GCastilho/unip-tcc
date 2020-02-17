import socketIO = require('socket.io')
import { EventEmitter } from 'events'
import * as currencies from './currencies'
import * as self from './self'
import User from '../userApi/user'
import Common from './currencies/common'
import { TxReceived, UpdtReceived } from '../db/models/transaction'

/** EventEmmiter genérico */
class Events extends EventEmitter {}

/** Tipo para variáveis/argumentos que precisam ser uma currency suportada */
export type SuportedCurrencies = Common['name']

export class CurrencyApi {
	// Módulos das currencies individuais (devem extender a common)
	protected _currencies = {
		nano: new currencies.Nano(),
		bitcoin: new currencies.Bitcoin()
	}

	/** Lista das currencies suportadas pela currencyApi */
	public currencies = Object.values(this._currencies).map(currency => currency.name)

	/**
	 * Um array de objetos com informações detalhadas sobre as currencies
	 * suportadas pela api
	 * 
	 * O objeto contém as propriedades 'name', 'code' e 'decimals'
	 */
	public currenciesDetailed = Object.values(this._currencies).map(currency => {
		const { name, code, decimals, supportedDecimals } = currency
		return { name, code, decimals: Math.min(decimals, supportedDecimals) }
	})

	/** EventEmmiter para eventos internos */
	// private _events = new Events()

	/** EventEmmiter para eventos públicos */
	public events = new Events()

	/**
	 * Adiciona o request de criar accounts na checklist e chama o método
	 * create_account das currencies solicitadas. Se nenhum account for
	 * especificada, será criado uma account de cada currency
	 * 
	 * @param userId O ObjectId do usuário
	 * @param currencies As currencies que devem ser criadas accounts
	 */
	public create_accounts = self.create_accounts

	/**
	 * Adiciona o request de withdraw na checklist e chama o withdraw loop
	 * 
	 * @param email O email do usuário que a currency será retirada
	 * @param currency A currency que será retirada
	 * @param address O address de destino do saque
	 * @param amount A quantidade que será sacada
	 */
	public withdraw = self.withdraw

	/** Listener da currencyApi, para comunicação com os módulos externos */
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

	constructor() {
		// Inicia o listener
		this.__listener(8085)
		
		/**
		 * Monitora os eventEmitters dos módulos individuais por certos eventos
		 * e reemite-os no eventEmitter público da currencyApi
		 */
		this.currencies.forEach(currency => {
			this._currencies[currency].events
				.on('new_transaction', (userId: User['id'], transaction: TxReceived) => {
					this.events.emit('new_transaction', userId, currency, transaction)
				})
				.on('update_received_tx', (userId: User['id'], updtReceived: UpdtReceived) => {
					this.events.emit('update_received_tx', userId, currency, updtReceived)
				})
		})
	}
}
