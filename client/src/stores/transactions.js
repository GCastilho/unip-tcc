import { writable, get } from 'svelte/store'
import axios from '../utils/axios'
import * as auth from './auth'
import { addSocketListener } from '../utils/websocket'

const { subscribe, set, update } = writable([])

/**
 * Exporta a store para permitir modificação da lista de transactions
 */
export { subscribe }

/** Faz um request de um array de transações e seta na store */
export async function loadTx() {
	if (!get(auth)) return
	try {
		const tx = await axios.get('/v1/user/transactions')
		set(tx.data)
	} catch(err) {
		console.error(err)
	}
}

/**
 * Faz um request de um array de transações pulando um certo numero de transações
 * e concatena na store existente
 * @param {number} skip numero de transações que sera puladas
 */
export async function reloadTx(skip) {
	try {
		const tx = await axios.get('/v1/user/transactions', { params: {skip} })
		update(value => value.concat(tx.data))
	} catch(err) {
		console.log(err)
	}
}

/** Atualiza a store ao receber uma nova transação */
addSocketListener('new_transaction', async (currency, transaction) => {
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
