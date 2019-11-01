/*
 * src/currencyApi/self/new_transaction.js
 * 
 * Monitora os eventEmitters dos módulos individuais por eventos de
 * 'new_transaction' e reemite-os no eventEmitter público da currencyApi
 */

module.exports = function init() {
	for (let currency in this.currencies) {
		this.currencies[currency].events.on('new_transaction', (email, transaction) => {
			this.events.emit('new_transaction', currency, email, transaction)
		})
	}
}
