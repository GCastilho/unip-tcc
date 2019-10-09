const bodyParser = require("body-parser")
const nanoRcp = require("./rcp")
const axios = require("axios")
const express = require("express")
const app = express()
const db = require("./db_handler")
require("./nanoWebSocket")

//deleta a collection do mongo db que armazena as contas
db.accountModel.collection.drop(function(err, result){
//falta um handle em caso de erro, mas acredito que nesse ponto so da erro se: ou a conexao com o banco de dados nao estiver estabelecida
//ou se ja nao existir uma collection de account
})

//solicita o servidor principal pela lista do contas NANO dos usuarios
axios.get('http://localhost:8085/account_list/nano', {
	responseType: 'stream'
}).then(({ data }) => {
	data.on('data', (chunk) => {
		//cada conta(que esta contida dentro de uma chunk) é imediatamente apos recebida, armazenada na collection do mongoDB
		new db.accountModel({ account: chunk.toString()}).save()
	})
	data.on('end', (chunk) => {
		console.log('ACABOU!!!!')
	})
}).catch((err) => {
	console.log(err)
})

const server = app.listen(50000, function () {   
   console.log("NANO api server listening at http://"+server.address().address+":"+server.address().port+"")
})
//um get que solicita uma conta nova para o rcp da nano numa carteira local padrao
app.get('/newAccount', function (req, res) {
    nanoRcp.createAccount(req, res)
})