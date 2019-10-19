/*
 * src/currencyApi/common/index.js
 * 
 * Esse módulo exporta um objeto com todos os módulos dessa pasta, os módulos
 * são acessíveis em uma propriedade com o nome do módulo. Ex.: this.modulo irá
 * retornar o retorno de um require('modulo.js') contido nessa pasta
 * 
 * Este módulo contém as funções comuns para todas as cryptocurrencies
 */

const _ = require('lodash')
const normalizedPath = require("path").join(__dirname)

const methods = {}

require('fs').readdirSync(normalizedPath)
.forEach(filename =>
	filename !== 'index.js' &&
	(methods[filename.replace('.js', '')] = require(`./${filename}`))
)

module.exports = class {
	constructor(currencyProps) {
		if (!currencyProps)
			throw new TypeError(`Incorrect initialization of 'common'`)

		/** Insere os métodos exportados pelos módulos individuais */
		for (let method in methods) {
			typeof methods[method] === 'object' ?
				this[method] = _.cloneDeep(methods[method]) :
				this[method] = methods[method]
			
			/** Da bind nas funções dos métodos */
			for (let prop in this._module) {
				if (typeof this[method][prop] === 'function') {
					this[method][prop] = this[method][prop].bind(this)
				}
			}
		}

		/**
		 * Insere as propriedades individuais na classe, sobrepondo
		 * se há conflito
		 */
		for (let prop in currencyProps) {
			this[prop] = currencyProps[prop]
		}
	}
}
