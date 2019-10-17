const port = 8091//process.env.PORT || 
const app = require("express")()
const nanoRcp = require("./rpc")

//um get que solicita uma conta nova para o rcp da nano numa carteira local padrao
app.get('/new_account', function (req, res) {
	nanoRcp.createAccount()
		.then(account => {
			res.send(account)
		}).catch(err => {
			res.status(500).send(err)
		})
})

app.post('/local/transaction', function (req, res) {
	//@TODO trocar por funcoes que salvam a transacao
	req.body.tx ? console.log(req.body.tx) : {}
})

function listen() {
	app.listen(port, () => {
		console.log(`BITCOIN API Server is listening on port ${port}`)
	})
}

module.exports = {
	listen
}
