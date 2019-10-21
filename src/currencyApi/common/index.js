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
			for (let prop in this[method]) {
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

		/**
		 * Dá bind em funções bindThis e depois as deleta. Funções 'bindThis'
		 * servem apenas para dar bind em suas funções e módulos internos, elas
		 * não são funções reais acessíveis da API e foram projetadas, para
		 * poder lidar com eventos de dentro de um módulo da currencyModule.
		 * A função é deletada para evitar poluição e para evitar que ela seja
		 * executada novamente
		 */
		for (let method in this) {
			if (this[method].name === 'bindThis') {
				this[method].bind(this)()
				delete this[method]
			}
		}

		/**
		 * Indica se o módulo externo está online ou não
		 * 
		 * Essa variável NÃO deve ser modificada diretamente,
		 * somente pelo '_connection'
		 * 
		 * @type {Boolean}
		 */
		this.isOnline = undefined

		/** Inicia a conexão com o módulo externo */
		this._connection.connect()
	}
}
