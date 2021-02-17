import mongoose from 'mongoose'

const ip = process.env.MONGODB_IP || '127.0.0.1'
const port = process.env.MONGODB_PORT || '27018'
const dbName = process.env.MONGODB_DB_NAME || 'exchange'

const mongodb_url = process.env.MONGODB_URL || `mongodb://${ip}:${port}/${dbName}`

/**
 * Conecta ao database usando as variáveis de ambiente informadas
 */
mongoose.connect(mongodb_url, {
	user: process.env.MONGODB_USER,
	pass: process.env.MONGODB_PASS,
	w: 'majority',
	readConcern: 'majority',
	j: true,
	wtimeout: 2000,
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false
})

mongoose.connection.on('error', (err) => {
	console.error('Database connection error:', err)
	process.exit(1)
})

/**
 * Ao exportar o mongoose, mantém-se as configurações
 * todas nesse arquivo e o acesso aos métodos do mongoose
 */
export = mongoose
