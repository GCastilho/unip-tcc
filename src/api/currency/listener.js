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

module.exports = function initCurrencyApi(api) {
	app.get('/:command/:currency', function(req, res) {
		const { command, currency } = req.params
		if (typeof api.currencies[currency] === 'undefined')
			return res.status(400).send({error: `The currency '${currency}' does not exist`})
		if (typeof api.currencies[currency][command] === 'undefined')
			return res.status(400).send({
				error: `'${command}' is not a valid command for the currency '${currency}'`
			})
		res.send(api.currencies[currency][command]())
	})

	app.post('/', function(req, res) {
		res.send('listener acessado por POST\n')
	})
}

app.listen(port, () => {
	console.log(`Internal API listener is up on port ${port}`)
})
