import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'

const transactions = []

const { subscribe, update } = writable(transactions)

/** Exporta o subscribe para esse módulo ser uma store */
export { subscribe }

/**
 * Busca por mais 10 transações caso a quantidade pedida não esteja na store
 * @param {number} [skip] O número de transações que devem ser puladas
 */
export async function fetch(skip = 0) {
	if (transactions.length < skip + 10) {
		/** @type {{data:any[]}} */
		const { data } = await axios.get('/v1/user/transactions', { params: { skip }})
		for (let tx of data) {
			const index = transactions.findIndex(v =>
				v.opid === tx.opid ||
				v.txid === tx.txid
			)
			if (index == -1)
				transactions.push(tx)
		}
		// Dá trigger na atualização da store
		update(txs => txs)
	}
}

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
