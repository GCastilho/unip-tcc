var express = require("express")
var bodyParser = require("body-parser");
var app = express()
var nanoRcp = require("./rcp.js")
const axios = require('axios')

/*app.post('handle',function(request,response){
    var query1=request.body.var1;
    var query2=request.body.var2;
});*/

app.get('/', function (req, res) {
    //TODO: transformar essa funcao em algo que realmente trata o request e o response
    nanoRcp.createAccount(req, res);
})

var server = app.listen(50000, function () {
    var host = server.address().address
    var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})

axios.get('http://localhost:8085/account_list/nano', {
	responseType: 'stream'
}).then(({ data }) => {
	data.on('data', (chunk) => {
		console.log(`'${chunk.toString()}'`)
	})
	data.on('end', (chunk) => {
		console.log(chunk)
		console.log('ACABOU!!1!')
	})
}).catch((err) => {
	console.log(err)
})