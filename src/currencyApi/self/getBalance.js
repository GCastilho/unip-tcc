/*
 * src/currencyApi/self/getBalance.js
 * 
 * Retorna o balance atual de um usuário
 */

const Person = require('../../db/models/person')

module.exports = async function getBalance(email, currency) {
	if (!email) throw new TypeError('\'email\' is required')
	if (!currency) throw new TypeError('\'currency\' is required')

	const person = await Person.findOne({
		email
	}, {
		[`currencies.${currency}.balance`]: 1
	})

	return person.currencies[currency].balance
}
