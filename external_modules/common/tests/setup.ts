import chai from 'chai'
import mongoose from 'mongoose'
import chaiAsPromised from 'chai-as-promised'

// Configura o plugin chai-as-promised no chai
chai.use(chaiAsPromised)

// Configura o 'should' para estar disponível nos testes
import 'chai/register-should'

// Conecta com o mongodb
mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/common-test', {
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
