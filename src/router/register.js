/**
 * src/router/register.js
 * 
 * Handler da página de cadastro de usuários
 */

const Router = require('express').Router()
const sha512 = require('js-sha512')
const bodyParser = require('body-parser')
const randomstring = require('randomstring')

const Person = require('../db/models/person')

/**
 * @description Ativa o middleware de parse no body enviado pelo form
 * da página de cadastro
 */
Router.use(bodyParser.json({ extended: true }))

Router.post('/', function(req, res) {
	const email = req.body.email
	const password = req.body.password
	if (!email || !password)
		return res.status(400).send({ error: 'Bad request' })

	const salt = randomstring.generate({ length: 32 })
	const password_hash = sha512.create()
		.update(salt)
		.update(password)
		.hex()

	new Person({
		email,
		credentials: {
			salt,
			password_hash
		},
		currencies: {
			// randomstring é apenas para demonstração
			nano: randomstring.generate(),
			bitcoin: randomstring.generate()
		}
	}).save()
	/**
	 * @todo Enviar e-mail de confirmação de... e-mail e só liberar a conta
	 * quando confirmado; Redirecionar para página de 'confirme o email'
	 * logo após o cadastro
	 */
	.then(person => {
		res.status(201).send(person)
	}).catch(err => {
		if (err.code === 11000)
			res.status(409).send()
		else
			res.status(500).send(err)
	})
})

module.exports = Router
