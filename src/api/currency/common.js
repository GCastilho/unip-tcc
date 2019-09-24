/*
 * src/api/currency/common.js
 * 
 * Módulo com as funções comuns para todas as cryptocurrencies
 */

module.exports = {
	hello: function hello() {
		return `hello from ${this.name}`
	},

	account_list: function get_account_list() {
		return `account_list implementada em ${this.name}`
	}
}
