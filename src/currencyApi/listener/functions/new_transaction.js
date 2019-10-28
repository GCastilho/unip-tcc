/*
 * src/currencyApi/listener/functions/new_transaction.js
 * 
 * Emite um evento 'new_transaction' no EventEmitter interno da currencyApi com
 * <currency name> como primeiro argumento e o objeto da transação
 * como o segundo
 * 
 * O listener é um módulo interno (que opera de maneira tecnicamente
 * independente do resto) da currencyApi, por esse motivo ele usa o EventEmitter
 * interno
 */

const { _events } = require('../../index')

module.exports = function new_transaction(body) {
	_events.emit('new_transaction', this.name, body)
}
