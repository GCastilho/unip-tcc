const app = require('express')()
const bodyParser = require('body-parser')
const setup = require('./setup')
const ExternalModuleEventEmitter = require('./events')
let EventEmmiter
app.use(bodyParser.urlencoded({extended: true}))

app.use(bodyParser.json({ extended: true }))
// Comunicação com o main server

/**
 * Responde pong para informar ao servidor principal que está vivo
 */
app.get('/ping', (req, res) => {
	res.send('pong')
})

/**
 * recebe requests para criação de nova account
 */
app.get('/new_account',function (req, res) {
	EventEmmiter.emit('new_account', res)
})

/**
 * recebe requests de envio de dinheiro
 * (address,amount)
 */
app.post('/send', function (req, res) {
	EventEmmiter.emit('send', req.body,res)
})

// Comunicação com a rede da moeda

/**
 * A rede da currency manda as novas transações aqui
 */
app.post('/transaction',function (req,res) {
	EventEmmiter.emit('transaction', req.body)
	res.send()
})


/**
 * Inicia o servidor da currency na porta especificada
 * 
 * @param {String} currency A currency que está sendo iniciada
 * @param {Number} port A porta do servidor
 */
async function listen(currency, port) {
	if (!port) throw new TypeError('port needs to be informed')

	await setup(currency)
	app.listen(port, () => {
		console.log(`${currency} API Server is listening on port ${port}`)
	})
	return EventEmmiter = new ExternalModuleEventEmitter()
}

module.exports = {
	listen
}
