
const mongoose = require('mongoose')
const mongodb_url = `mongodb://127.0.0.1:27017/db-${process.env.CURRENCY}`

mongoose.connect(mongodb_url,{
	
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
