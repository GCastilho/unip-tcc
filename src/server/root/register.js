/**
 * Handler da página de cadastro de usuários
 */

const Router = require('express').Router()
const bodyParser = require('body-parser')

const userApi = require('../../userApi')

/**
 * Ativa o middleware de parse no body enviado pelo form da página de cadastro
 */
Router.use(bodyParser.json({ extended: true }))

Router.post('/', function(req, res) {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'Bad request' })

	userApi.createUser(req.body.email, req.body.password)
		/**
		 * @todo Enviar e-mail de confirmação de... e-mail e só liberar a conta
		 * quando confirmado
		 */
		.then(() => {
			res.status(201).send()
		}).catch(err => {
			if (err.code === 11000) {
				res.status(409).send()
			} else {
				res.status(500).send()
				console.error('Register error:', err)
			}
		})
})

module.exports = Router
