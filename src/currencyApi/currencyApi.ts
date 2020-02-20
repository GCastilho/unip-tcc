import socketIO = require('socket.io')
import { ObjectId } from 'mongodb'
import { EventEmitter } from 'events'
import * as currencies from './currencies'
import User from '../userApi/user'
import Common from './currencies/common'
import Checklist from '../db/models/checklist'
import Transaction from '../db/models/transaction'
import { TransactionInternal as Tx } from '../db/models/transaction'
import { Person } from '../db/models/person/interface'

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
	public create_accounts = async (
		userId: Person['_id'],
		currencies: string[] = this.currencies
	): Promise<void> => {
		/**
		 * O objeto 'create_accounts' que será salvo na checklist do database
		 */
		const create_accounts = {}
		for (let currency of currencies) {
			create_accounts[currency] = {}
			create_accounts[currency].status = 'requested'
		}

		await Checklist.findOneAndUpdate({
			userId
		}, {
			commands: { create_accounts }
		}, {
			upsert: true
		})

		/**
		 * Chama create_account de cada currency que precisa ser criada uma account
		 */
		currencies.forEach(currency => this._currencies[currency].create_account())
	}

	/**
	 * Adiciona o request de withdraw na checklist e chama a função de withdraw
	 * desta currency
	 * 
	 * @param email O email do usuário que a currency será retirada
	 * @param currency A currency que será retirada
	 * @param address O address de destino do saque
	 * @param amount A quantidade que será sacada
	 */
	public withdraw = async (
		user: User,
		currency: SuportedCurrencies,
		account: string,
		amount: number
	): Promise<ObjectId> => {
		/**
		 * O identificador único dessa operação
		 */
		const opid = new ObjectId()

		// Adiciona o comando de withdraw na checklist
		await Checklist.findOneAndUpdate({
			userId: user.id
		}, {
			$push: {
				[`commands.withdraw.${currency}`]: {
					status: 'preparing',
					opid
				}
			}
		}, {
			upsert: true
		})

		// Adiciona a operação na Transactions
		const transaction = await new Transaction({
			_id: opid,
			user: user.id,
			type: 'send',
			currency,
			status: 'processing',
			account,
			amount,
			timestamp: new Date()
		}).save()

		try {
			/** Tenta atualizar o saldo */
			await user.balanceOps.add(currency, {
				opid,
				type: 'transaction',
				amount: - Math.abs(amount) // Garante que o amount será negativo
			})
		} catch(err) {
			if (err === 'NotEnoughFunds') {
				// Remove a transação da collection e o item da checklist
				await transaction.remove()
				await Checklist.updateOne({
					userId: user.id
				}, {
					$pull: {
						[`commands.withdraw.${currency}`]: { opid }
					}
				})
			}
			/** Da throw no erro independente de qual erro seja */
			throw err
		}

		/**
		 * Atualiza a operação na checklist para o status 'requested', que
		 * sinaliza para o withdraw_loop que os check iniciais (essa função)
		 * foram bem-sucedidos
		 */
		await Checklist.updateOne({
			userId: user.id,
			[`commands.withdraw.${currency}.opid`]: opid
		}, {
			$set: {
				[`commands.withdraw.${currency}.$.status`]: 'requested'
			}
		})

		/** Chama o método da currency para executar o withdraw */
		this._currencies[currency].withdraw()

		return opid
	}

	/**
	 * Monitora os eventEmitters dos módulos individuais por eventos de
	 * 'new_transaction' e reemite-os no eventEmitter público da currencyApi
	 */
	private __new_transaction() {
		this.currencies.forEach(currency => {
			this._currencies[currency].events
				.on('new_transaction', (userId: User['id'], transaction: Tx) => {
					this.events.emit('new_transaction', userId, currency, transaction)
			})
		})
	}

	constructor() {
		// Inicia o listener da currencyApi
		const port = 8085
		const io = socketIO(port)
		console.log('CurrencyApi listener is up on port', port)

		/**
		 * Listener da currencyApi, para comunicação com os módulos externos
		 * 
		 * Ao receber uma conexão em '/<currency>' do socket, chama a função
		 * connection do módulo desta currency
		 */
		this.currencies.forEach(currency => {
			io.of(currency).on('connection', (socket: socketIO.Socket) => {
				console.log(`Connected to the '${currency}' module`)
				this._currencies[currency].connection(socket)
			})
		})
		
		// Inicializa o monitor de transações recebidas
		this.__new_transaction()
	}
}
