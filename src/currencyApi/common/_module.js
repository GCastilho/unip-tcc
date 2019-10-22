/*
 * src/currencyApi/common/_module.js
 * 
 * Módulo privado que permite a conexão com o módulo externo, expõe uma função
 * get() e uma função post()
 * 
 */

const axios = require('axios')

module.exports = function constructor() {
	/**
	 * Ponte para comunicação com o módulo externo usando GET
	 * @param {String} command O Sub-endereço que será acessado
	 */
	const get = async (command) => {
		if (!command)
			throw new TypeError(`'command' is required`)

		try {
			const { data } = await axios.get(`http://${this.ip}:${this.port}/${command}`)
			return data
		} catch(err) {
			this._events.emit('error', this.name)
			err.currency = this.name
			throw err
		}
		
	}

	/**
	 * Ponte para comunicação com o módulo externo usando POST
	 * @param {String} command O Sub-endereço que será acessado
	 * @param {*} body O que será enviado ao módulo externo no request
	 */
	const post = async (command, body) => {
		if (!command)
			throw new TypeError(`'command' is required`)

		try {
			const { data } = await axios.post(`http://${this.ip}:${this.port}/${command}`, body)
			return data
		} catch(err) {
			this._events.emit('error', this.name)
			err.currency = this.name
			throw err
		}
	}

	return {
		get,
		post
	}
}
