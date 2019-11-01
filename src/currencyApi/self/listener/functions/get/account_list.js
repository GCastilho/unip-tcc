/*
 * src/currencyApi/self/listener/functions/get/account_list.js
 * 
 * Retorna uma stream de strings separada por newLine, cada string é
 * uma account da currency solicitada
 */

const Person = require('../../../../../db/models/person')

module.exports = function get_account_list(currency, res) {
	Person.find()
		.lean()
		.cursor()
		.on('data', ({ currencies }) => {
			if (!currencies) return
			currencies[currency].accounts.forEach(account => {
				res.write(`${account}\n`)
			})
		})
		.on('end', () => {
			res.end()
		})
}
