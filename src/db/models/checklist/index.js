/*
 * src/db/models/checklist/index.js
 */

const mongoose = require('mongoose')

module.exports = mongoose.model('Checklist', {
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		unique: true
	},
	create_accounts: {
		bitcoin: {
			type: Boolean,
			type: String
		},
		nano: {
			type: Boolean,
			type: String
		}
	}
})
