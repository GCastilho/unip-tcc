/*
 * src/api/currency/common.js
 * 
 * Módulo com as funções comuns para todas as cryptocurrencies
 */

const axios = require('axios')

module.exports = {
	create_account: function create_account(req, res) {
		axios.get(`http://${this.ip}:${this.port}/new_account`)
		.then(({ data }) => {
			res.send(data)
		}).catch(err => {
			res.status(500).send({ error: 'Internal server error' })
		})
	}
}
