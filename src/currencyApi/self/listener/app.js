/*
 * src/currencyApi/self/listener/app.js
 *
 * Ouve e processa os requests HTTP vindo dos entrypoints de comunicação com as
 * blockchains e chama a função adequada para processá-los
 */

const port = process.env.CURRENCY_API_PORT || 8085
const app = require('express')()
const bodyParser = require('body-parser')

app.use(bodyParser.json({ extended: true }))

module.exports = function init_listener_app() {
	app.get('/:command/:currency', listener_get = (req, res) => {
		const { command, currency } = req.params
		if (!this.api.currencies[currency])
			return res.status(400).send({
				error: `The currency '${currency}' does not exist`
			})
		if (typeof this.get[command] != 'function')
			return res.status(400).send({
				error: `'${command}' is not a valid command'`
			})
		const response = this.get[command](currency, res)
		if (response) res.send(response)
	})

	app.get('*', (req, res) => {
		res.status(400).send({ error: 'bad request' })
	})
	
	app.post('/:command/:currency', listener_post = (req, res) => {
		const { body, params: { command, currency } } = req
		if (!body)
			return res.status(400).send({
				error: 'Request body needs to be informed'
			})
		if (!this.api.currencies[currency])
			return res.status(400).send({
				error: `The currency '${currency}' does not exist`
			})
		if (typeof this.post[command] != 'function')
			return res.status(400).send({
				error: `'${command}' is not a valid command'`
			})
		const response = this.post[command](currency, body)
		if (response) res.send(response)
	})
	
	app.post('*', (req, res) => {
		res.status(400).send({ error: 'bad request' })
	})

	app.listen(port, () => {
		console.log(`CurrencyApi listener is up on port ${port}`)
	})
}
