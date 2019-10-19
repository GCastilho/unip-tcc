/*
 * src/currencyApi/common/_module.js
 * 
 * Módulo privado que permite a conexão com o módulo externo, expõe uma função
 * get() e uma função post()
 * 
 * Esse módulo precisa ser inicializado com uma referência
 * a 'currencyApi.currency.<currency>'
 */

const axios = require('axios')

/** Referência a 'currencyApi.currency.<currency>' */
let parent = undefined

async function get(command) {
	if (!command)
		throw new TypeError(`'command' is required`)

	try {
		const { data } = await axios.get(`http://${parent.ip}:${parent.port}/${command}`)
		return data
	} catch(err) {
		// Iniciar o loop de (checar a) conexão
		throw new Error(`${parent.name} server is offline`)
	}
	
}

async function post(command, body) {
	if (!command)
		throw new TypeError(`'command' is required`)

	try {
		const { data } = await axios.post(`http://${parent.ip}:${parent.port}/${command}`, body)
		return data
	} catch(err) {
		// Iniciar o loop de (checar a) conexão
		throw new Error(`${parent.name} server is offline`)
	}
}

const _module = function constructor(that) {
	if (typeof that != 'object')
		throw new TypeError(`Incorrect initialization of '_module' sub-module`)

	parent = that
}

const methods = {
	get,
	post
}

for (let method in methods) {
	_module[method] = methods[method]
}

module.exports = _module
