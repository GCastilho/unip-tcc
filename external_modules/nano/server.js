const port = process.env.PORT || 50000
const app = require("express")()
const nanoRcp = require("./rcp")

//um get que solicita uma conta nova para o rcp da nano numa carteira local padrao
app.get('/createAccount', function (req, res) {
	nanoRcp.createAccount().then((account) =>{
		res.send(account)
	})
})

function listen() {
	app.listen(port, () => {
		console.log(`NANO API Server is listening on port ${port}`)
	})
}

module.exports = {
	listen
}
