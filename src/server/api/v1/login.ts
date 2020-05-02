import express from 'express'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import * as UserApi from '../../../userApi'
import * as Session from '../../../db/models/session'
import * as RandomString from 'randomstring'

const router = express.Router()

// Parsers
router.use(bodyParser())
router.use(cookieParser())
router.use(express.json())


/**
 * recebe o request de login
 */
router.post('/', async (req, res) => {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'Bad request' })

	await UserApi.findUser.byEmail(
		req.body.email
	).then(user => {
		user.checkPassword(req.body.password)

		return Session.default.findOneAndUpdate({
			userId: user.id
		}, {
			sessionId: RandomString.generate(128),
			token: RandomString.generate(128),
			date: new Date()
		}, {
			new: true,
			upsert: true
		})
	}).then(session => {
		/**
		 * Se a autenticação, a criação e o salvamento da sessão forem bem
		 * sucedidas, seta o cookie no header e retorna o token
		 *
		 * @todo cookie ter tempo de expiração
		 */
		res.cookie('sessionId', session.sessionId,{httpOnly:true})
		res.send({ token: session.token })
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
	return res.status(500).send({ error: 'Internal server error' })
})

/**
 * Retorna informações sobre os subpath de /user
 */
 router.get('/', (_req, res) => {
	res.send({
		description: 'Entrypoint for requests specific to a login',
	})
})

/**
 * Retorna NotFound se não for encontrado o path
 */
router.all('/*', (_req, res) => {
	res.status(404).send({
		error: 'NotFound',
		message: 'Endpoint not found'
	})
})
export default router
