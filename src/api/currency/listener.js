/*
 * src/api/internal/listener.js
 * 
 * Esse módulo ouve por requests HTTP vindo dos entrypoints de comunicação
 * com as blockchains e faz o redirecionamento adequado
 */

const port = 8085
const app = require('express')()
const bodyParser = require('body-parser')

app.use(bodyParser.json({extended: true}))

module.exports = function listenerModule(api) {
	app.get('/:command/:currency', function(req, res) {
		const {command, currency} = req.params
		if (!api.currencies[currency])
			return res.status(400).send({error: `The currency '${currency}' does not exist`})
		if (!api.currencies[currency][command])
			return res.status(400).send({
				error: `'${command}' is not a valid command for the currency '${currency}'`
			})
		const response = api.currencies[currency][command](req, res)
		if (response) res.send(response)
	})

	app.post('/', function(req, res) {
		res.send('listener acessado por POST\n')
	})
}

app.listen(port, () => {
	console.log(`CurrencyApi listener is up on port ${port}`)
})
