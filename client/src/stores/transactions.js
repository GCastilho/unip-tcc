import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import * as auth from './auth'

const { subscribe, update, set } = writable([])

/** Quantidade de transações presentes na store */
let storeLength = 0
subscribe(v => storeLength = v.length)

/** Indica se o cliente está sincronizado com as transações do servidor */
let fullySync = false

/** Flag que indica se a função de fetch está sendo executada */
let inSync = false

/** Exporta o subscribe para esse módulo ser uma store */
export { subscribe }

/**
 * Busca por mais 10 transações caso a quantidade pedida não esteja na store
 * @param {number} [skip] O número de transações que devem ser puladas
 */
export async function fetch() {
	if (fullySync || inSync) return
	inSync = true

	/** @type {{data: any[]}} */
	const { data } = await axios.get('/v1/user/transactions', {
		params: { skip: storeLength }
	})

	update(transactions => {
		for (let tx of data) {
			const index = transactions.findIndex(v =>
				v.opid === tx.opid ||
				v.txid === tx.txid
			)
			if (index == -1)
				transactions.push(tx)
		}

		/**
		 * storeLength só é atualizada quando essa função retorna, então aqui ela
		 * ainda está com o length antigo
		 */
		if (storeLength == transactions.length)
			fullySync = true
		return transactions
	})

	inSync = false
}

/**
 * Inicializa a store com as transações mais recentes quando o usuário faz
 * login e reseta-a quando o usuário faz logout
 */
auth.subscribe(v => {
	if (v) fetch()
	else set([])
})

/** Atualiza a store ao receber uma nova transação */
addSocketListener('new_transaction', async (currency, transaction) => {
	console.log('new_transaction', transaction)
	update(tx => [transaction, ...tx])
})

/** Atualiza uma transação 'receive' existente na store */
addSocketListener('update_received_tx', async (currency, transaction) => {
	console.log('update_received_tx', transaction)
	update(tx => {
		const index = tx.findIndex(tx =>
			tx.opid === transaction.opid ||
			tx.txid === transaction.txid
		)
		if (index >= 0)
			tx[index] = {...tx[index], ...transaction}
		return tx
	})
})

/** Atualiza uma transação 'send' existente na store */
addSocketListener('update_sent_tx', async (currency, transaction) => {
	console.log('update_sent_tx', transaction)
	update(tx => {
		const index = tx.findIndex(tx =>
			tx.opid === transaction.opid ||
			tx.txid === transaction.txid
		)
		if (index >= 0)
			tx[index] = {...tx[index], ...transaction}
		return tx
	})
})
