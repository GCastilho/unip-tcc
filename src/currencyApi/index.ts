import socketIO from 'socket.io'
import { ObjectId } from 'mongodb'
import { EventEmitter } from 'events'
import User from '../userApi/user'
import Currency from './currency'
import Transaction from '../db/models/transaction'
import { balanceOperations as BalanceOps } from '../db/models/person'
import { currencies, currencyNames, currenciesObj } from '../libs/currencies'
import type TypedEmitter from 'typed-emitter'
import type { Person } from '../db/models/person'
import type { SuportedCurrencies } from '../libs/currencies'
import type { TxInfo, UpdtReceived, UpdtSent, CancelledSentTx } from '../../interfaces/transaction'

/**
 * Interface para padronizar os eventos públicos
 */
interface PublicEvents {
	new_transaction: (userId: User['id'], currency: SuportedCurrencies, transaction: TxInfo) => void
	update_received_tx: (userId: User['id'], currency: SuportedCurrencies, updtReceived: UpdtReceived) => void
	update_sent_tx: (userId: User['id'], currency: SuportedCurrencies, updtSent: UpdtSent|CancelledSentTx) => void
}

/** Módulos das currencies individuais */
const _currencies = Object.fromEntries(
	currencies.map(currency => [
		currency.name,
		new Currency(currency.name, currency.fee)
	])
) as { [key in SuportedCurrencies]: Currency }

/** EventEmmiter para eventos públicos */
export const events = new EventEmitter() as TypedEmitter<PublicEvents>

/**
 * Executa um request de criar account da currency informada. Se houver algum
 * erro no processo, essa função irá rejeitar
 *
 * @param userId O ObjectId do usuário
 * @param currency As currencies que devem ser criadas accounts
 */
export async function createAccount(
	userId: Person['_id'],
	currency: SuportedCurrencies
): Promise<string> {
	return _currencies[currency].createAccount(userId)
}

/**
 * Adiciona o request de saque, trava o saldo do usuário e chama a função de
 * withdraw desta currency
 *
 * @param email O email do usuário que a currency será retirada
 * @param currency A currency que será retirada
 * @param address O address de destino do saque
 * @param amount A quantidade que será sacada
 * @throws AmountOutOfRange If amount < 2*fee
 * @throws NotEnoughFunds If there are not enough balance available
 * @throws ValidationError from mongoose
 */
export async function withdraw(
	userId: Person['_id'],
	currency: SuportedCurrencies,
	account: string,
	amount: number
): Promise<ObjectId> {
	const { decimals, fee } = currenciesObj[currency]
	if (amount < 2 * fee) throw {
		error: 'AmountOutOfRange',
		message: `Withdraw amount for ${currency} must be at least '${2 * fee}', but got ${amount}`
	}

	/**
	 * O identificador único dessa operação
	 */
	const opid = new ObjectId()

	// Desconta o fee do amount
	const _amount = amount * Math.pow(10, decimals)
	const _fee = fee * Math.pow(10, decimals)

	// Adiciona a operação na Transactions
	const transaction = await new Transaction({
		_id: opid,
		userId,
		type: 'send',
		currency,
		status: 'processing',
		account,
		amount: (_amount - _fee) / Math.pow(10, decimals),
		fee: _currencies[currency].fee,
		timestamp: new Date()
	}).save()

	try {
		/** Tenta atualizar o saldo */
		await BalanceOps.add(userId, currency, {
			opid,
			type: 'transaction',
			amount: - Math.abs(amount) // Garante que o amount será negativo
		})
	} catch (err) {
		if (err === 'NotEnoughFunds') {
			await transaction.remove()
		}
		/** Da throw no erro independente de qual erro seja */
		throw err
	}

	/**
	 * Atualiza a transação para o status 'ready', que sinaliza para o sistema
	 * que os check iniciais (essa função) foram bem-sucedidos
	 */
	transaction.status = 'ready'
	await transaction.save()

	/** Chama o método da currency para executar o withdraw */
	await _currencies[currency].withdraw(transaction)

	return opid
}

/**
 * Cancela uma transação se ela ainda não foi enviada para a rede
 *
 * @param userId O id do usuário que requisitou o cancelamento
 * @param currency A currency da transação que deve ser cancelada
 * @param opid O id da transação que será cancelada
 * @returns {string} 'cancelled' Caso a transação tenha sido cancelada com sucesso
 * @returns {string} 'requested' Caso o a transação tenha sido agendada para cancelamento
 */
export async function cancellWithdraw(
	userId: ObjectId,
	currency: SuportedCurrencies,
	opid: ObjectId
): Promise<string> {
	return await _currencies[currency].cancellWithdraw(userId, opid)
}

// Inicia o listener da currencyApi
const port = process.env.CURRENCY_API_PORT || 8085
const io = socketIO(port)
console.log('CurrencyApi listener is up on port', port)

/**
 * Listener da currencyApi, para comunicação com os módulos externos
 *
 * Ao receber uma conexão em '/<currency>' do socket, chama a função connection
 * do módulo desta currency
 */
currencyNames.forEach(currency => {
	io.of(currency).on('connection', (socket: socketIO.Socket) => {
		console.log(`Connected to the '${currency}' module`)
		_currencies[currency].connection(socket)
	})
})

/**
 * Monitora os eventEmitters dos módulos individuais por eventos relevantes
 * e os reemite no eventEmitter público da currencyApi
 */
currencyNames.forEach(currency => {
	_currencies[currency].events
		.on('new_transaction', (userId, transaction) => {
			events.emit('new_transaction', userId, currency, transaction)
		})
		.on('update_received_tx', (userId, updtReceived) => {
			events.emit('update_received_tx', userId, currency, updtReceived)
		})
		.on('update_sent_tx', (userId, updtSent) => {
			events.emit('update_sent_tx', userId, currency, updtSent)
		})
})
