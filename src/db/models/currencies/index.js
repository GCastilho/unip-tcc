/*
 * src/db/models/currency/index.js
 * 
 * Esse módulo exporta um schema com todas as currencies com módulos nessa
 * pasta. O Schema base é definido no currencySchema, sendo acrescentado (com
 * conflitos sobrepostos) com os objetos definidos nos módulos individuais de
 * cada currency (Nota: nada impede um múdulo q exporta um objeto vazio). O
 * schema será no padrão: 'currency: currencyschema + require(currency.js)'
 * para cada 'currency.js' nessa pasta (com exceção deste módulo)
 *
 * Se a account de uma currency não for informada, o valor padrão que será
 * armazenado é um array vazio
 */

const normalizedPath = require("path").join(__dirname)
const Schema = require('mongoose').Schema

const currencySchema = {
	type: [String],
	unique: true,
	trim: true
}

const currencies = {}

require('fs').readdirSync(normalizedPath)
.forEach(filename =>
	filename !== 'index.js' &&
	(currencies[filename.replace('.js', '')] = Object.assign({}, currencySchema, require(`./${filename}`)))
)

/**
 * @throws ValidationError
 */
module.exports = new Schema(currencies)
