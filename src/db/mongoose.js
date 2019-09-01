const mongoose = require('mongoose')

/**
 * @description Conecta ao database 'exchange' do mongodb no localhost
 */
mongoose.connect('mongodb://127.0.0.1:27017/exchange', {
	user: 'exchange',
	pass: 'password',
	useNewUrlParser: true,
	useCreateIndex: true
})
const db = mongoose.connection

/**@todo Parar a execução do script em caso de erro de conexão com o DB */
db.on('error', console.error.bind(console, 'Database connection error:'))

/**
 * @description ao exportar o mongoose, mantém-se as configurações
 * todas nesse arquivo e o acesso aos métodos do mongoose
 */
module.exports = mongoose
