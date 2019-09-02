/**
 * src/db/models/cookie.js
 * 
 * @description Model da collection de cookie de autenticação
 */

const mongoose = require('mongoose')

module.exports = mongoose.model('Cookie', {
	email: {
		type: String,
		required: true,
		unique: true
	},
	sessionID: {
		type: String,
		required: true,
		unique: true
	},
	date: {
		type: Date,
		required: true
	}
})
