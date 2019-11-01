/**
 * src/currencyApi/currencyModule/new_transaction.js
 * 
 * Processa novas transações desta currency, atualizando o balanço do usuário
 * correspondente e emitindo um evento de 'new_transaction' no EventEmitter
 * externo da currencyApi
 */

const Person = require('../../db/models/person')

module.exports = async function new_transaction(transaction) {
	console.log('received new transaction', transaction)
	const person = await Person.findOne({
		[`currencies.${this.name}.accounts`]: transaction.account
	})
	person.currencies[this.name].received.push(transaction)
	await person.save()
	console.log({person})
	return 'received'
}
