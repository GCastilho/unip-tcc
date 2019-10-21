/*
 * src/currencyApi/common/_module.js
 * 
 * Módulo privado que permite a conexão com o módulo externo, expõe uma função
 * get() e uma função post()
 * 
 * Esse módulo supõe que o 'this' é o currencyModule
 */

const axios = require('axios')

/**
 * Ponte para comunicação com o módulo externo usando GET
 * @param {String} command O Sub-endereço que será acessado
 */
async function get(command) {
	if (!command)
		throw new TypeError(`'command' is required`)

	try {
		const { data } = await axios.get(`http://${this.ip}:${this.port}/${command}`)
		return data
	} catch(err) {
		this._connection.emit('error', this.name)
		err.currency = this.name
		throw err
	}
	
}

/**
 * Ponte para comunicação com o módulo externo usando POST
 * @param {String} command O Sub-endereço que será acessado
 * @param {*} body O que será enviado ao módulo externo no request
 */
async function post(command, body) {
	if (!command)
		throw new TypeError(`'command' is required`)

	try {
		const { data } = await axios.post(`http://${this.ip}:${this.port}/${command}`, body)
		return data
	} catch(err) {
		this._connection.emit('error', this.name)
		err.currency = this.name
		throw err
	}
}

module.exports = {
	get,
	post
}
