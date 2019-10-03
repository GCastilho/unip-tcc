const bodyParser = require("body-parser")
const nanoRcp = require("./rcp")
const axios = require("axios")
const express = require("express")
const app = express()
const mongoose = require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/exchange', {
	user: 'exchange_server',
	pass: 'uLCwAJH49ZRzCNW3',
	useNewUrlParser: true,
	useCreateIndex: true
})
const account = mongoose.model('account', { account: String })

account.collection.drop(function(err, result){
//falta um handle em caso de erro, mas acredito que nesse ponto so da erro se: ou a conexao com o banco de dados nao estiver estabelecida
//ou se ja nao existir uma collection de account
})
axios.get('http://localhost:8085/account_list/nano', {
	responseType: 'stream'
}).then(({ data }) => {
	data.on('data', (chunk) => {
		new account({ account: chunk.toString()}).save()
	})
	data.on('end', (chunk) => {
		console.log('ACABOU!!!!')
	})
}).catch((err) => {
	console.log(err)
})
const server = app.listen(50000, function () {
    var host = server.address().address
    var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})

app.get('/newAccount/', function (req, res) {
    //TODO: transformar essa funcao em algo que realmente trata o request e o response
    nanoRcp.createAccount(req, res)
})