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

/**
 * Adiciona ao map uma nova transação recebida
 */
addSocketListener('new_transaction', (currency, transaction) => {
	transactions.set(transaction.opid, transaction)
})

/**
 * Atualiza uma transação recebida
 */
addSocketListener('update_received_tx', async (currency, updtReceived) => {
	const txInfo = await getByOpid(updtReceived.opid)
	txInfo.status = updtReceived.status
	txInfo.confirmations = updtReceived.status === 'confirmed' ? undefined : updtReceived.confirmations
	transactions.set(updtReceived.opid, txInfo)
})

/**
 * Atualiza uma transação enviada
 */
addSocketListener('update_sent_tx', async (currency, updtSent) => {
	const txInfo = await getByOpid(updtSent.opid)
	txInfo.txid = updtSent.txid
	txInfo.status = updtSent.status
	txInfo.confirmations = updtSent.status === 'confirmed' ? undefined : updtSent.confirmations
	txInfo.timestamp = updtSent.timestamp
	transactions.set(updtSent.opid, txInfo)
})
