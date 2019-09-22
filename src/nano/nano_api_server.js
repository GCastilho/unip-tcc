var express = require("express")
var bodyParser = require("body-parser");
var app = express()
var nanoRcp = require("./rcp.js")

/*app.post('handle',function(request,response){
    var query1=request.body.var1;
    var query2=request.body.var2;
});*/

app.get('/', function (req, res) {
    //TODO: transformar essa funcao em algo que realmente trata o request e o response
    nanoRcp.createAccount();
    res.send('Hello World');
})

var server = app.listen(50000, function () {
    var host = server.address().address
    var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})