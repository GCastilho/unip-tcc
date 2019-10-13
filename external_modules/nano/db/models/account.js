const mongoose = require('../mongoose')

const Account = mongoose.model('account', {
	account: {
		type: String,
		trim: true,
		unique: true,
		required: true
	}
})

module.exports = Account
