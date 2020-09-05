import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'
import { updateBalances } from './balances'
import * as auth from './auth'

const { subscribe, update, set } = writable([])

/** Exporta o subscribe para esse módulo ser uma store */
export { subscribe }

/** Flag que indica se a função de fetch está sendo executada */
let inSync = false

/** Indica se o cliente está sincronizado com as transações do servidor */
let fullySync = false

/** Quantidade de transações presentes na store */
let storeLength = 0
subscribe(v => storeLength = v.length)

/**
 * Busca por mais 10 transações caso a não esteja sincronizada com o servidor
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

/**
 * Realiza um request de saque e atualiza a store de transactions
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

	update(txs => ([
		{
			opid: data,
			currency,
			account: destination,
			amount,
			fee: 0 // Fix
		},
		...txs
	]))

	updateBalances(currency, -amount, amount)
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

/** Atualiza uma transação 'receive' existente na store */
addSocketListener('update_received_tx', async (currency, txUpdate) => {
	console.log('update_received_tx', txUpdate)
	update(tx => {
		const index = tx.findIndex(tx =>
			tx.opid === txUpdate.opid ||
			tx.txid === txUpdate.txid
		)
		if (index >= 0)
			tx[index] = {...tx[index], ...txUpdate}
		if (txUpdate.status == 'confirmed')
			updateBalances(currency, txUpdate.amount, -txUpdate.amount)
		return tx
	})
})

/** Atualiza uma transação 'send' existente na store */
addSocketListener('update_sent_tx', async (currency, txUpdate) => {
	console.log('update_sent_tx', txUpdate)
	update(tx => {
		const index = tx.findIndex(tx =>
			tx.opid === txUpdate.opid ||
			tx.txid === txUpdate.txid
		)
		if (index >= 0)
			tx[index] = {...tx[index], ...txUpdate}
		if (txUpdate.status == 'confirmed')
			updateBalances(currency, 0, -txUpdate.amount)
		return tx
	})
})
