import axios from 'axios'
import { writable } from 'svelte/store'
import currencies from '../utils/currencies'
import balances from './balances'
import { addSocketListener } from '../utils/websocket'
import * as auth from './auth'
import type { Currencies } from '../routes/currencies'
import type { TxJSON } from '../routes/user/transactions/index'
import type { UpdtReceived, UpdtSent } from '../../../interfaces/transaction'

// See https://github.com/Microsoft/TypeScript/issues/25760
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Transaction = Optional<TxJSON, 'txid'|'timestamp'>

const { subscribe, update, set } = writable<Transaction[]>([])

/** Exporta o subscribe para esse módulo ser uma store */
export { subscribe }

/** Reseta a store de transações quando o usuário faz logout */
auth.subscribe(v => !v && set([]))

/** Flag que indica se a função de fetch está sendo executada */
let inSync = false

/** Indica se o cliente está sincronizado com as transações do servidor */
let fullySync = false

/**
 * Exporta uma store em synchronized q indica se essa store está sincronizada
 * ou não; Essa store também mantém a variável fullySync atualizada
 */
const { subscribe: subFullySync, set: setFullySync } = writable<boolean>(false)
export const synchronized = { subscribe: subFullySync }
subFullySync(v => fullySync = v)

/** Quantidade de transações presentes na store */
let storeLength = 0
subscribe(v => storeLength = v.length)

/**
 * Busca por mais 10 transações caso a não esteja sincronizada com o servidor
 */
export async function fetch() {
	if (fullySync || inSync) return
	inSync = true

	try {
		const { data } = await axios.get<TxJSON[]>('/user/transactions', {
			params: { skip: storeLength }
		})

		update(transactions => {
			for (const tx of data) {
				const index = transactions.findIndex(v => v.opid === tx.opid)
				if (index == -1)
					transactions.push(tx)
			}

			/**
			 * storeLength só é atualizada quando essa função retorna, então aqui ela
			 * ainda está com o length antigo
			 */
			if (storeLength == transactions.length) setFullySync(true)
			return transactions
		})
	} catch (err) {
		console.error('Error fetching transactions', err)
	}

	inSync = false
}

/**
 * Realiza um request de saque
 * @param currency A currency que será sacada
 * @param destination O endereço de destino que as moedas devem ser enviadas
 * @param amount A quantidade dessa currency que será sacada
 */
export async function withdraw(
	currency: keyof Currencies,
	destination: string,
	amount: number
) {
	const { data } = await axios.post<{ opid: string }>('/user/transactions', {
		currency,
		destination,
		amount
	})
	console.log('new transaction sent, opid is:', data.opid)

	update(txs => ([
		{
			opid: data.opid,
			type: 'send',
			status: 'processing',
			currency,
			account: destination,
			amount,
			fee: currencies[currency].fee
		},
		...txs
	]))

	balances.updateBalances(currency, -amount, amount)
}

/**
 * Cancela uma operação de saque caso ela ainda não tenha sido executada
 * @param opid O opid da transação que será cancelada
 */
export async function cancell(opid: string) {
	try {
		const { data } = await axios.delete<{ message: string }>(`/user/transactions/${opid}`)
		if (data.message == 'cancelled') {
			update(txs => {
				const index = txs.findIndex(v => v.opid == opid)
				txs.splice(index, 1)
				return txs
			})
		} else {
			console.log('The cancell request returned:', data)
		}
	} catch (err) {
		console.error('Error cancelling transaction', err)
	}
}

/** Atualiza a store ao receber uma nova transação */
addSocketListener('new_transaction', (
	currency: keyof Currencies,
	transaction: TxJSON
) => {
	console.log('new_transaction', transaction)
	update(txs => [transaction, ...txs])
	if (transaction.status == 'confirmed') {
		balances.updateBalances(currency, transaction.amount, 0)
	} else {
		balances.updateBalances(currency, 0, transaction.amount)
	}
})

/**
 * Requisita da API e adiciona ao array uma transação que não está
 * na store de transações
 * @param {string} opid O opid da transação que não está na store
 */
async function insertMissingTx(opid: string) {
	if (typeof opid != 'string')
		throw new TypeError(`opid must be a string, got ${typeof opid}`)

	try {
		const { data } = await axios.get<Transaction>(`/v1/user/transactions/${opid}`)
		if (typeof data != 'object')
			throw new TypeError(`Invalid response type: expected 'object', got ${typeof data}`)
		update(txs => {
			// Adiciona a transação na posição correta do array
			const index = txs.findIndex(tx => tx.timestamp < data.timestamp)
			if (index > 0) {
				txs.splice(index, 0, data)
			} else {
				txs.unshift(data)
			}
			return txs
		})
	} catch (err) {
		console.error('Error fetching transaction', err)
	}
}

/** Atualiza uma transação 'receive' existente na store */
addSocketListener('update_received_tx', async (
	currency: keyof Currencies,
	txUpdate: UpdtReceived
) => {
	console.log('update_received_tx', txUpdate)
	update(txs => {
		const index = txs.findIndex(tx => tx.opid === txUpdate.opid)
		if (index >= 0) {
			txs[index] = { ...txs[index], ...txUpdate }
			if (txUpdate.status == 'confirmed')
				balances.updateBalances(currency, txs[index].amount, -txs[index].amount)
		} else {
			insertMissingTx(txUpdate.opid)
		}
		return txs
	})
})

/** Atualiza uma transação 'send' existente na store */
addSocketListener('update_sent_tx', async (
	currency: keyof Currencies,
	updtSent: UpdtSent
) => {
	console.log('update_sent_tx', updtSent)
	update(txs => {
		const index = txs.findIndex(tx => tx.opid === updtSent.opid)
		if (index >= 0) {
			if (updtSent.status == 'cancelled') {
				txs.splice(index, 1)
				balances.updateBalances(currency, txs[index].amount, -txs[index].amount)
			} else {
				// @ts-expect-error TS não está entendendo que cancelled n é possível aq
				txs[index] = { ...txs[index], ...updtSent }
				if (updtSent.status == 'confirmed')
					balances.updateBalances(currency, 0, -txs[index].amount)
			}
		} else {
			insertMissingTx(updtSent.opid)
		}
		return txs
	})
})
