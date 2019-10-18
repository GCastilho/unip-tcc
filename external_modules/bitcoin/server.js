const port = process.env.PORT ||  8091
const app = require("express")()
const bitcoinRcp = require("./rpc")
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
const Transaction = require('./db/models/transaction')

//um get que solicita uma conta nova para o rcp da nano numa carteira local padrao
app.get('/new_account', function (req, res) {
	bitcoinRcp.createAccount()
		.then(account => {
			res.send(account)
		}).catch(err => {
			res.status(500).send(err)
		})
})
app.post('/transaction', function (req) {
	//@TODO reformat transaction data,send data do main server
	const txid = req.body.tx
	bitcoinRcp.transactionInfo(txid)
		.then(transaction => {
			new Transaction ({
				tx: txid,
				info: transaction
			}).save()
		}).catch(err => {
			res.status(500).send(err)
		})
  })

function listen() {
	app.listen(port, () => {
		console.log(`BITCOIN API Server is listening on port ${port}`)
	})
}

module.exports = {
	listen
}
