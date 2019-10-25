const port = process.env.PORT || 8090
const app = require("express")()
const nanoRcp = require("./rpc")

//um get que solicita uma conta nova para o rcp da nano numa carteira local padrao
app.get('/new_account', function(req, res) {
	nanoRcp.createAccount()
	.then(account =>{
		res.send(account)
	}).catch(err => {
		res.status(500).send(err)
	})
})
app.post('/transaction', function (req,res) {
	//@TODO reformat transaction data,send data do main server
	const txid = req.body.tx
	bitcoinRcp.transactionInfo(txid)
		.then(transaction => {
			if(!transaction.generated){
				new Transaction ({
					tx: txid,
					info: transaction
				}).save().catch(err => {
					console.log("erro")
				})
			}
		}).catch(err => {
			console.log
		})
		res.send('ok')
})

app.get('/ping', function(req, res) {
	res.send('pong')
})

function listen() {
	app.listen(port, () => {
		console.log(`NANO API Server is listening on port ${port}`)
	})
}

module.exports = {
	listen
}
