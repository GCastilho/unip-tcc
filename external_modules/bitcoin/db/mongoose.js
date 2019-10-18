const mongoose = require('mongoose')
const mongodb_url = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/exchange-bitcoin'

mongoose.connect(mongodb_url, {
	user: process.env.MONGODB_USER,
	pass: process.env.MONGODB_PASS,
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true
})

const db = mongoose.connection

db.on('error', (err) => {
	console.error('Database connection error:', err)
	process.exit(1)
})

module.exports = mongoose
