/*
 * src/currencyApi/listener/functions/account_list.js
 * 
 * Retorna uma stream de strings separada por newLine, cada string é
 * uma account da currency solicitada
 */

const Person = require('../../../db/models/person')

module.exports = function get_account_list(req, res) {
	Person.find()
	.lean()
	.cursor()
	.on('data', ({currencies}) => {
		currencies[this.name].forEach(account => {
			res.write(`${account}\n`)
		})
	})
	.on('end', () => {
		res.end()
	})
}
