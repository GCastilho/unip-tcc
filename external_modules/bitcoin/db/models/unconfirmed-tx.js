const mongoose = require('../../../common/db/mongoose')

const unconfirmedTransaction = mongoose.model('transactions-unconfirmed', {
	tx: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	blockCount: {
		type: Number,
		default: 0,
		trim: true,
		required: true
	}
	

})

module.exports = unconfirmedTransaction
