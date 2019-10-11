/*
 * src/api/currency/common.js
 * 
 * Módulo com as funções comuns para todas as cryptocurrencies
 */

const Person = require('../db/models/person')

module.exports = {
	account_list: function get_account_list(req, res) {
		Person.find({})
		.lean()
		.cursor()
		.on('data', ({currencies}) => {
			currencies[this.currency].forEach(account => {
				res.write(`${account}\n`)
			})
		})
		.on('end', () => {
			res.end()
		})
	}
}
