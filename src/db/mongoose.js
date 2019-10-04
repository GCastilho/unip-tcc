const mongoose = require('mongoose')

/**
 * @description Conecta ao database 'exchange' do mongodb no localhost
 */
mongoose.connect('mongodb://127.0.0.1:27017/exchange', {
	user: 'exchange_server',
	pass: 'uLCwAJH49ZRzCNW3',
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true
})
const db = mongoose.connection

db.on('error', (err) => {
	console.error('Database connection error:', err)
	process.exit(1)
})

/**
 * Ao exportar o mongoose, mantém-se as configurações
 * todas nesse arquivo e o acesso aos métodos do mongoose
 */
module.exports = mongoose
