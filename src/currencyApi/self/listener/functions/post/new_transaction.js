/*
 * src/currencyApi/self/listener/functions/post/new_transaction.js
 *
 * Chama a função 'new_transaction' da <currency> para que esta transação
 * recebida seja corretamente processada
 */

module.exports = function new_transaction(currency, transaction) {
	return this.currencies[currency].new_transaction(transaction)
}