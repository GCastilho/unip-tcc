/*
 * src/router/login.js
 * 
 * Handler da página de autenticação de usuários
 */

const Router = require('express').Router()
const bodyParser = require('body-parser')
const sha512 = require('js-sha512')
const randomstring = require("randomstring")

const Person = require('../db/models/person')
const Cookie = require('../db/models/cookie')

/**
 * @description Ativa o middleware para dar parse no body enviado pelo form
 * da página de login
 */
Router.use(bodyParser.json({ extended: true }))

Router.post('/', function(req, res) {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'Bad request' })

	Person.findOne({
		email: req.body.email
	}).then((person) => {
		if (person === null) throw 'UserNotFound'

		/**
		 * @description o 'password_hash' armazenado no database é o sha512 da
		 * concatenação do salt com o password do usuário, então para verificar
		 * a validade do password fornecido temos que recriar o hash seguindo
		 * o mesmo processo
		 */
		const password_hash = sha512.create()
			.update(person.credentials.salt)
			.update(req.body.password)
			.hex()

		if (person.credentials.password_hash != password_hash)
			throw 'InvalidCredentials'

		/**
		 * @description A partir daqui o código só é executado se
		 * o usuário está autenticado
		 */

		const sessionID = randomstring.generate(128)

		/**@see https://mongoosejs.com/docs/api.html#model_Model.findOneAndUpdate */
		return Cookie.findOneAndUpdate({
			email: req.body.email
		}, {
			sessionID,
			date: new Date()
		}, {
			new: true,
			upsert: true,
			useFindAndModify: false
		})
	}).then((cookie) => {
		/**
		 * @description Se a autenticação, a criação e o salvamento do
		 * cookie foram bem sucedidas, redireciona o usuário para a
		 * home com o cookie de autenticação
		 * @todo cookie ter tempo de expiração
		 */
		res.cookie('sessionID', cookie.sessionID)
		res.redirect(303, '/')
	}).catch((err) => {
		if (err === 'UserNotFound' || err === 'InvalidCredentials') {
			/**
			 * @description Diferenciar usuário não encontrado de credenciais
			 * inválidas faz com que seja possível descobrir quais usuários
			 * estão cadastrados no database, por isso a mensagem é a mesma
			 * 
			 * @todo Redirecionar o usuário para uma página com
			 * a mensagem de erro
			 */
			res.status(401).send({ error: 'Not authorized' })
		} else {
			/**
			 * @description Esse else pode ser chamado em situações onde não foi
			 * um erro interno do servidor, como uma entrada malformada
			 * 
			 * @todo Fazer um error handling melhor
			 */
			res.status(500).send({ error: 'Internal server error' })
		}
	})
})

module.exports = Router
