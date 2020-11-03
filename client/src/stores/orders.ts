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
 * Cancela uma operação de saque caso ela ainda não tenha sido executada
 * @param {string} opid O opid da transação que será cancelada
 */
export async function cancell(opid) {
	try {
		/** @type {{data: {message: string}}} */
		const { data } = await axios.delete(`/v1/user/transactions/${opid}`)
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
addSocketListener('new_transaction', (currency, transaction) => {
	console.log('new_transaction', transaction)
	update(txs => [transaction, ...txs])
	if (transaction.status == 'confirmed') {
		updateBalances(currency, transaction.amount, 0)
	} else {
		updateBalances(currency, 0, transaction.amount)
	}
})
