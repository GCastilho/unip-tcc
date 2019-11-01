const mongoose = require('mongoose')

/**
 * Conecta ao database usando as variáveis de ambiente informadas
 */
mongoose.connect(process.env.MONGODB_URL, {
	user: process.env.MONGODB_USER,
	pass: process.env.MONGODB_PASS,
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false
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
