import chai from 'chai'
import mongoose from 'mongoose'
import chaiAsPromised from 'chai-as-promised'

// Configura o plugin chai-as-promised no chai
chai.use(chaiAsPromised)

// Configura o 'should' para estar disponível nos testes
import 'chai/register-should'

// Configura a porta que a Common deve procurar para a CurrencyApi (mocked)
process.env.MAIN_SERVER_PORT = '5808'

// Configura o database que deve ser usado
process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'common-test'
const dbName = process.env.MONGODB_DB_NAME

const ip = process.env.MONGODB_IP || '127.0.0.1'
const port = process.env.MONGODB_PORT || '27017'
const mongodb_url = process.env.MONGODB_URL || `mongodb://${ip}:${port}/${dbName}`

// Conecta com o mongodb
mongoose.connect(mongodb_url, {
	user: process.env.MONGODB_USER,
	pass: process.env.MONGODB_PASS,
	// N sei se o melhor é 'snapshot' ou 'majority' aqui
	readConcern: 'snapshot',
	w: 'majority',
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
	useUnifiedTopology: true
}).catch(err => {
	console.error('Database connection error:', err)
	process.exit(1)
})
