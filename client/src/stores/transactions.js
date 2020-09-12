import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { updateBalances } from './balances'
import { get as getCurrency } from './currencies'
import { addSocketListener } from '../utils/websocket'
import * as auth from './auth'

const { subscribe, update, set } = writable([])

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
const { subscribe: subFullySync, set: setFullySync } = writable(false)
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
		/** @type {{data: any[]}} */
		const { data } = await axios.get('/v1/user/transactions', {
			params: { skip: storeLength }
		})

		update(transactions => {
			for (let tx of data) {
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
 * @param {string} currency A currency que será sacada
 * @param {string} destination O endereço de destino que as moedas devem ser enviadas
 * @param {number} amount A quantidade dessa currency que será sacada
 */
export async function withdraw(currency, destination, amount) {
	/** @type {{data: string}} O opid do request de saque */
	const { data } = await axios.post('/v1/user/transactions', {
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
			fee: getCurrency(currency).fee
		},
		...txs
	]))

	updateBalances(currency, -amount, amount)
}

/**
 * Cancela uma operação de saque caso ela ainda não tenha sido executada
 * @param {string} opid O opid da transação que será cancelada
 */
export async function cancell(opid) {
	try {
		await axios.delete(`/v1/user/transactions/${opid}`)
		update(txs => {
			const index = txs.findIndex(v => v.opid == opid)
			txs.splice(index, 1)
			return txs
		})
	} catch (err) {
		console.error('Error cancelling transaction', err)
	}
}

/** Atualiza a store ao receber uma nova transação */
addSocketListener('new_transaction', (currency, transaction) => {
	console.log('new_transaction', transaction)
	update(txs => [transaction, ...txs])
	if (transaction.status == 'confirmed') {
		updateBalances(currency, transaction.amount, 0)
	} else {
		updateBalances(currency, 0, transaction.amount)
	}
})

/**
 * Requisita da API e adiciona ao array uma transação que não está
 * na store de transações
 * @param {string} opid O opid da transação que não está na store
 */
async function insertMissingTx(opid) {
	if (typeof opid != 'string')
		throw new TypeError(`opid must be a string, got ${typeof opid}`)

	try {
		const { data } = await axios.get(`/v1/user/transactions/${opid}`)
		if (typeof data != 'object')
			throw new TypeError(`Invalid response type: expected 'object', got ${typeof data}`)
		update(txs => {
			// Adiciona a transação na posição correta do array
			const index = txs.findIndex(tx => tx.timestamp < data.timestamp)
			if (index > 0) {
				txs.splice(index, 0, res.data)
			} else {
				txs.unshift(data)
			}
		})
	} catch (err) {
		console.error('Error fetching transaction', err)
	}
}

/** Atualiza uma transação 'receive' existente na store */
addSocketListener('update_received_tx', async (currency, txUpdate) => {
	console.log('update_received_tx', txUpdate)
	update(txs => {
		const index = txs.findIndex(tx => tx.opid === txUpdate.opid)
		if (index >= 0) {
			txs[index] = {...txs[index], ...txUpdate}
			if (txUpdate.status == 'confirmed')
				updateBalances(currency, txs[index].amount, -txs[index].amount)
		} else {
			insertMissingTx(txUpdate.opid)
		}
		return txs
	})
})

/** Atualiza uma transação 'send' existente na store */
addSocketListener('update_sent_tx', async (currency, txUpdate) => {
	console.log('update_sent_tx', txUpdate)
	update(txs => {
		const index = txs.findIndex(tx => tx.opid === txUpdate.opid)
		if (index >= 0) {
			txs[index] = {...txs[index], ...txUpdate}
			if (txUpdate.status == 'confirmed')
				updateBalances(currency, 0, -txs[index].amount)
		} else {
			insertMissingTx(txUpdate.opid)
		}
		return txs
	})
})
