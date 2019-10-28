const port = process.env.PORT
const Currency = process.env.CURRENCY
const app = require("express")()
const processTransaction = require(`../${Currency}/process-transaction`)
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))

//um get que solicita uma conta nova para o rcp da nano numa carteira local padrao
app.get('/new_account', function (req, res) {
	Rcp.createAccount()
		.then(account => {
			res.send(account)
		}).catch(err => {
			res.status(500).send(err)
		})
})
app.post('/transaction', function (req, res) {
	//@TODO reformat transaction data,send data do main serve
	res.send('ok')
	processTransaction.process(req)
})

function listen() {
	app.listen(port, () => {
		console.log(`${Currency.toUpperCase()} API Server is listening on port ${port}`)
	})
}

module.exports = {
	listen
}
