import mongoose, { connect, connection } from 'mongoose'

const mongodb_url = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/exchange'

/**
 * Conecta ao database usando as variáveis de ambiente informadas
 */
connect(mongodb_url, {
	user: process.env.MONGODB_USER,
	pass: process.env.MONGODB_PASS,
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false
})

connection.on('error', (err) => {
	console.error('Database connection error:', err)
	process.exit(1)
})

/**
 * Ao exportar o mongoose, mantém-se as configurações
 * todas nesse arquivo e o acesso aos métodos do mongoose
 */
export = mongoose
