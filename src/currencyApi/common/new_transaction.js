/**
 * src/currencyApi/currencyModule/new_transaction.js
 * 
 * Processa novas transações desta currency, atualizando o balanço do usuário
 * correspondente e emitindo um evento de 'new_transaction' no EventEmitter
 * externo da currencyApi
 */

const Person = require('../../db/models/person')

module.exports = async function new_transaction(transaction) {
	if (!transaction) throw new TypeError('\'transaction\' is required')

	const person = await Person.findOneAndUpdate({
		[`currencies.${this.name}.accounts`]: transaction.account
	}, {
		$push: { [`currencies.${this.name}.received`]: transaction },
		$inc: { [`currencies.${this.name}.balance`]: transaction.ammount }
	})

	if (!person) throw { code: 404, message: 'No user found for this account'}

	this.events.emit('new_transaction', person.email, transaction)

	return 'received'
}
