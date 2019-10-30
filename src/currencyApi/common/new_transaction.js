/**
 * src/currencyApi/currencyModule/new_transaction.js
 * 
 * Processa novas transações desta currency, atualizando o balanço do usuário
 * correspondente e emitindo um evento de 'new_transaction' no EventEmitter
 * externo da currencyApi
 */

module.exports = function new_transaction(transaction) {
	console.log('received new transaction', transaction)
	return 'received'
}
