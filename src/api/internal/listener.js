/**
 * src/api/internal/listener.js
 * 
 * @description Esse módulo ouve por requests HTTP vindo dos entrypoints de
 * comunicação com as blockchains e faz o redirecionamento adequado
 */

const port = 8085
const app = require('express')()
const bodyParser = require('body-parser')

app.use(bodyParser.json({extended: true}))

app.post('/', function(req, res) {
	res.send('hello from listener')
})

app.listen(port, () => {
	console.log(`Internal API listener is up on port ${port}`)
})
