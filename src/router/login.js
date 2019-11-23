/*
 * Handler da página de autenticação de usuários
 */

const Router = require('express').Router()
const bodyParser = require('body-parser')
const randomstring = require('randomstring')

const Cookie = require('../db/models/cookie')
const userApi = require('../userApi')

/**
 * @description Ativa o middleware para dar parse no body enviado pelo form
 * da página de login
 */
Router.use(bodyParser.json({ extended: true }))

Router.post('/', function(req, res) {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'Bad request' })

	userApi.user({
		email: req.body.email
	}).then(user => {
		user.checkPassword(req.body.password)

		return Cookie.findOneAndUpdate({
			personId: user.getObjectId()
		}, {
			sessionID: randomstring.generate(128),
			date: new Date()
		}, {
			new: true,
			upsert: true,
			useFindAndModify: false
		})
	}).then(cookie => {
		/**
		 * Se a autenticação, a criação e o salvamento do cookie foram bem
		 * sucedidas, redireciona o usuário para a home com o
		 * cookie de autenticação
		 * 
		 * @todo cookie ter tempo de expiração
		 */
		res.cookie('sessionID', cookie.sessionID)
		res.redirect(303, '/')
	}).catch(err => {
		if (err === 'UserNotFound' || err === 'InvalidPassword') {
			/**
			 * Diferenciar usuário não encontrado de credenciais inválidas
			 * faz com que seja possível descobrir quais usuários estão
			 * cadastrados no database, por isso a mensagem é a mesma
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
