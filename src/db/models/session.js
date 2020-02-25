/*
 * Model da collection de autenticação
 */

const mongoose = require('mongoose')

module.exports = mongoose.model('Cookie', {
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		unique: true,
		ref: 'Person'
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
