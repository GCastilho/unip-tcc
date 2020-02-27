import { emit, addSocketListener } from './websocket'

/**
 * Map das transações armazenadas no cliente, a chave é o opid
 * e o valor é um TxInfo
 * 
 * @type {Map.<string, object>}
 * 
 * @todo Usar type da interface ao invés de 'object'
 */
const transactions = new Map()

/**
 * Adiciona ao map uma nova transação recebida
 */
addSocketListener('new_transaction', (currency, transaction) => {
	transactions.set(transaction.opid, transaction)
})

/**
 * Retorna uma transação pelo seu opid
 * @param {string} opid O identificador dessa transação
 */
export async function getByOpid(opid) {
	let txInfo = transactions.get(opid)
	if (!txInfo) {
		txInfo = await emit('get_tx_info', opid)
		transactions.set(txInfo.opid, txInfo)
	}
	return txInfo
}
