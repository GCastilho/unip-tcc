/*
 * src/currencyApi/listener/functions/index.js
 * 
 * Esse módulo exporta um objeto com todos os módulos dessa pasta, os módulos
 * são acessíveis em uma propriedade com o nome do módulo. Ex.: this.modulo irá
 * retornar o retorno de um require('modulo.js') contido nessa pasta
 */

const normalizedPath = require("path").join(__dirname)

const functions = {}

require('fs').readdirSync(normalizedPath)
.forEach(filename =>
	filename !== 'index.js' &&
	(functions[filename.replace('.js', '')] = require(`./${filename}`))
)

module.exports = functions
