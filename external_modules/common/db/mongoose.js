/**
 * external_modules/common/db/mongoose.js
 * 
 * Expõe uma promessa no método 'init' do mongoose, que resolve quando o
 * database se conecta
 */

const mongoose = require('mongoose')
const mongodb_url = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017'
const db = mongoose.connection

mongoose.init = function init(database) {
	return new Promise((resolve, reject) => {
		if (!database) reject('database needs to be informed')

		mongoose.connect(`${mongodb_url}/${database}`, {
			user: process.env.MONGODB_USER,
			pass: process.env.MONGODB_PASS,
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true
		})

		db.on('connected', () => {
			delete mongoose.init
			resolve()
		})

		db.on('error', (err) => {
			console.error('Database connection error:', err)
			process.exit(1)
		})
	})
}

module.exports = mongoose
