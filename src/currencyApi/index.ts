import socketIO = require('socket.io')
import { ObjectId } from 'mongodb'
import { EventEmitter } from 'events'
import { Nano, Bitcoin } from './currencies'
import User from '../userApi/user'
import Common from './currencies/common'
import Checklist from '../db/models/checklist'
import Transaction from '../db/models/transaction'
import type { TxReceived, UpdtReceived } from '../db/models/transaction'
import type { Person } from '../db/models/person'

/** Tipo para variáveis/argumentos que precisam ser uma currency suportada */
export type SuportedCurrencies = Common['name']

/** Módulos das currencies individuais (devem extender a common) */
const _currencies = {
	nano: new Nano(),
	bitcoin: new Bitcoin()
}

/** Lista das currencies suportadas pela currencyApi */
export const currencies = Object.values(_currencies).map(currency => currency.name)

/**
 * Um array de objetos com informações detalhadas sobre as currencies
 * suportadas pela api
 * 
 * O objeto contém as propriedades 'name', 'code' e 'decimals'
 */
export const currenciesDetailed = Object.values(_currencies).map(currency => {
	const { name, code, decimals, supportedDecimals } = currency
	return { name, code, decimals: Math.min(decimals, supportedDecimals) }
})

/** EventEmmiter para eventos internos */
// const _events = new EventEmitter()

/** EventEmmiter para eventos públicos */
export const events = new EventEmitter()

/**
 * Adiciona o request de criar accounts na checklist e chama o método
 * create_account das currencies solicitadas. Se nenhum account for
 * especificada, será criado uma account de cada currency
 * 
 * @param userId O ObjectId do usuário
 * @param currenciesToCreate As currencies que devem ser criadas accounts
 */
export async function create_accounts(
	userId: Person['_id'],
	currenciesToCreate: string[] = currencies
): Promise<void> {
	const itemsToSave = currenciesToCreate.map(currency => {
		return new Checklist({
			opid: new ObjectId(),
			userId,
			command: 'create_account',
			currency,
			status: 'requested'
		})
	})

	const promises = itemsToSave.map(item => item.save())

	await Promise.all(promises)

	/**
	 * Chama create_account de cada currency que precisa ser criada uma account
	 */
	currenciesToCreate.forEach(currency => _currencies[currency].create_account())
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
export async function withdraw(
	user: User,
	currency: SuportedCurrencies,
	account: string,
	amount: number
): Promise<ObjectId> {
	/**
	 * O identificador único dessa operação
	 */
	const opid = new ObjectId()

	// Adiciona o comando de withdraw na checklist
	const item = await new Checklist({
		opid,
		userId: user.id,
		command: 'withdraw',
		currency,
		status: 'preparing'
	}).save()

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
	} catch (err) {
		if (err === 'NotEnoughFunds') {
			// Remove a transação da collection e o item da checklist
			await Promise.all([
				transaction.remove(),
				item.remove()
			])
		}
		/** Da throw no erro independente de qual erro seja */
		throw err
	}

	/**
	 * Atualiza a operação na checklist para o status 'requested', que sinaliza
	 * para o withdraw_loop que os check iniciais (essa função) foram
	 * bem-sucedidos
	 */
	item.status = 'requested'
	await item.save()

	/** Chama o método da currency para executar o withdraw */
	_currencies[currency].withdraw()

	return opid
}

// Inicia o listener da currencyApi
const port = 8085
const io = socketIO(port)
console.log('CurrencyApi listener is up on port', port)

/**
 * Listener da currencyApi, para comunicação com os módulos externos
 * 
 * Ao receber uma conexão em '/<currency>' do socket, chama a função connection
 * do módulo desta currency
 */
currencies.forEach(currency => {
	io.of(currency).on('connection', (socket: socketIO.Socket) => {
		console.log(`Connected to the '${currency}' module`)
		_currencies[currency].connection(socket)
	})
})

/**
 * Monitora os eventEmitters dos módulos individuais por eventos relevantes
 * e os reemite no eventEmitter público da currencyApi
 */
currencies.forEach(currency => {
	_currencies[currency].events
		.on('new_transaction', (userId: User['id'], transaction: TxReceived) => {
			events.emit('new_transaction', userId, currency, transaction)
		})
		.on('update_received_tx', (userId: User['id'], updtReceived: UpdtReceived) => {
			events.emit('update_received_tx', userId, currency, updtReceived)
		})
})
