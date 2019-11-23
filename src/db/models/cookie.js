/*
 * Model da collection de cookie de autenticação
 */

const mongoose = require('mongoose')

module.exports = mongoose.model('Cookie', {
	personId : {
		type: mongoose.SchemaTypes.ObjectId,
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
