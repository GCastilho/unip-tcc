const mongoose = require('mongoose')

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
	}
})
