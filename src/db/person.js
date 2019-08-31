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
		password_hash: {
			type: String,
			required: false
		},
		salt: {
			type: String,
			required: false
		}
	}
})
