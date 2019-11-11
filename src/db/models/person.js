/**
 * src/db/models/person.js
 * 
 * @description Model da collection de usuários (people)
 */

const mongoose = require('../mongoose')
const currencieSchema = require('./currencies')

module.exports = mongoose.model('Person', {
	email: {
		type: String,
		trim: true,
		lowercase: true,
		unique: true,
		required: true,
	},
	credentials: {
		salt: {
			type: String,
			required: true
		},
		password_hash: {
			type: String,
			required: true
		}
	},
	currencies: currencieSchema
})
