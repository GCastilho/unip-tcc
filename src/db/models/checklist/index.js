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
	commands: {
		create_accounts: {
			bitcoin: {
				status: String,
				accounts_before: Number,
				accounts_after: Number,
			},
			nano: {
				status: String,
				accounts_before: Number,
				accounts_after: Number,
			}
		}
	}
})
