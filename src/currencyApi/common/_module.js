/*
 * src/currencyApi/common/_module.js
 * 
 * Módulo privado que permite a conexão com o módulo externo, expõe uma função
 * get() e uma função post()
 * 
 * Esse módulo supõe que o 'this' é o currencyModule
 */

const axios = require('axios')

async function get(command) {
	if (!command)
		throw new TypeError(`'command' is required`)

	try {
		const { data } = await axios.get(`http://${this.ip}:${this.port}/${command}`)
		return data
	} catch(err) {
		this._connection.emit('error', this.name)
		throw new Error(`${this.name} server is offline`)
	}
	
}

async function post(command, body) {
	if (!command)
		throw new TypeError(`'command' is required`)

	try {
		const { data } = await axios.post(`http://${this.ip}:${this.port}/${command}`, body)
		return data
	} catch(err) {
		this._connection.emit('error', this.name)
		throw new Error(`${this.name} server is offline`)
	}
}

module.exports = {
	get,
	post
}
