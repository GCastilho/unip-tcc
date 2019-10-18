const mongoose = require('../mongoose')

const account = mongoose.model('account-bitcoin', {
	account: {
		type: String,
		trim: true,
		unique: true,
		required: true
	}
})

module.exports = account
