const mongoose = require('../mongoose')

const unconfirmedTransaction = mongoose.model('transactions-unconfirmed', {
	tx: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	blockCount: {
		type: Number,
		trim: true,
		required: true
	}
	

})

module.exports = unconfirmedTransaction
