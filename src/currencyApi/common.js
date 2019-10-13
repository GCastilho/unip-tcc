/*
 * src/api/currency/common.js
 * 
 * Módulo com as funções comuns para todas as cryptocurrencies
 */

const axios = require('axios')

module.exports = {
	create_account: function create_account() {
		return axios.get(`http://${this.ip}:${this.port}/new_account`)
		.then(({ data }) => {
			return data
		}).catch(err => {
			throw new Error(`Fail do to retrieve ${this.name} account`)
		})
	}
}
