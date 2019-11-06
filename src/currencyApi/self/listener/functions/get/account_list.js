/*
 * src/currencyApi/self/listener/functions/get/account_list.js
 * 
 * Retorna uma stream de strings separada por newLine, cada string é
 * uma account da currency solicitada
 */

const Person = require('../../../../../db/models/person')

module.exports = function get_account_list(currency, res) {
	const person = Person.find({}, {
		_id: 0,
		[`currencies.${currency}`]: 1
	}).lean().cursor()

	person.on('data', ({ currencies }) => {
		if (!currencies) return
		currencies[currency].accounts.forEach(account => {
			res.write(`${account}`)
		})
	})

	person.on('end', () => {
		res.end()
	})
}
