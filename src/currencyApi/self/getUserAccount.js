/**
 * src/currencyApi/self/getUserAccount.js
 * 
 * Retorna a ccunt de um usuário para determinada currency
 */

const Person = require('../../db/models/person')

module.exports = async function getUserAccount(email, currency) {
	if (!email) throw new TypeError('\'email\' is required')
	if (!currency) throw new TypeError('\'currency\' is required')

	const person = await Person.findOne({
		email
	}, {
		[`currencies.${currency}.accounts`]: 1
	})

	if (!person) throw `User not found: ${email}`

	return person.currencies[currency].accounts
}
