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

const normalizedPath = require('path').join(__dirname)
const Schema = require('mongoose').Schema

const transaction = {
	txid: {
		type: String,
		required: true,
		unique: true
	},
	account: {
		type: String,
		required: true
	},
	ammount: {
		type: Number,
		required: true
	},
	timestamp: {
		type: Date,
		required: true
	}
}

const currencySchema = {
	balance: {
		type: Number,
		default: 0
	},
	accounts: {
		type: [String],
		/**
		 * @todo Como o sparse não funciona em indices compostos, fazer uma
		 * função de validação personalizada que verifica se o novo endereço
		 * é de fato único
		 */
		// sparse: true,
		// unique: true,
		trim: true
	},
	received: {
		type: [transaction]
	},
	sended: {
		type: [transaction]
	}
}

const currencies = {}

require('fs').readdirSync(normalizedPath)
	.forEach(filename => {
		if (filename === 'index.js') return
		// currencySchema.accounts = {...currencySchema.accounts, ...require(`./${filename}`)}
		currencies[filename.replace('.js', '')] = currencySchema
	})

/**
 * @throws ValidationError
 */
module.exports = new Schema(currencies)
