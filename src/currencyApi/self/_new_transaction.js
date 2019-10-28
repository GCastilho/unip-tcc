/**
 * scr/currencyApi/_new_transaction.js
 * 
 * Ouve por eventos de 'new_transaction' e a retransmite para o módulo da
 * currency correspondente
 */

module.exports = function init() {
	this._events.on('new_transaction', (currency, transaction) => {
		this.currencies[currency].new_transaction(transaction)
	})
}
