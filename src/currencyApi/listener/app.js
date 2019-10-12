/*
 * src/currencyApi/listener/app.js
 *
 * Ouve e processa os requests HTTP vindo dos entrypoints de comunicação com as
 * blockchains e chama a função adequada para processá-los
 */

const port = process.env.CURRENCY_API_PORT || 8085
const app = require('express')()
const bodyParser = require('body-parser')

app.use(bodyParser.json({ extended: true }))

module.exports = function listener_app(api) {
	app.get('/:command/:currency', function listener_get(req, res) {
		const {command, currency} = req.params
		if (!api[currency])
			return res.status(400).send({ error: `The currency '${currency}' does not exist` })
		if (!api[currency][command])
			return res.status(400).send({
				error: `'${command}' is not a valid command for the currency '${currency}'`
			})
		const response = api[currency][command](req, res)
		if (response) res.send(response)
	})
	
	app.get('*', (req, res) => {
		res.status(400).send({ error: 'bad request' })
	})
	
	app.post('/', function listener_post(req, res) {
		res.send('listener acessado por POST\n')
	})
	
	app.post('*', (req, res) => {
		res.status(400).send({ error: 'bad request' })
	})

	return app
}

if (process.env.NODE_ENV !== 'test') {
	app.listen(port, () => {
		console.log(`CurrencyApi listener is up on port ${port}`)
	})
}
