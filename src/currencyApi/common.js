/*
 * src/api/currency/common.js
 * 
 * Módulo com as funções comuns para todas as cryptocurrencies
 */

const axios = require('axios')
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
	},
	create_account: function create_account(req, res) {
		axios.get(`http://192.168.0.101:${this.port}/new_account`)
		.then(({ data }) => {
			res.send(data)
		}).catch(err => {
			res.status(500).send(err)
		})
	}
}
