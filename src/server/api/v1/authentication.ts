import express from 'express'
import Person from '../../../db/models/person'
import Session from '../../../db/models/session'
import { authentication } from './middlewares'
import * as randomstring from 'randomstring'

const router = express.Router()

/**
 * Handler do request de autenticação
 */
router.post('/authentication', async (req, res): Promise<any> => {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'BadRequest' })

	try {
		const person = await Person.findOne({
			email: req.body.email
		}, {
			credentials: true
		})
		if (!person) throw 'UserNotFound'
		if (!person.credentials.check(`${req.body.password}`)) throw 'InvalidPassword'

		const session = await Session.findOneAndUpdate({
			userId: person.id
		}, {
			sessionId: randomstring.generate(128),
			token: randomstring.generate(128),
			date: new Date()
		}, {
			new: true,
			upsert: true
		})

		/**
		 * Se a autenticação, a criação e o salvamento da sessão forem bem
		 * sucedidas, retorna o token de autenticação com o websocket e o header
		 * 'authentication', necessário para autenticação com a API
		 *
		 * @todo token e header terem tempo de expiração
		 */
		res.send({
			token: session.token,
			authorization: session.sessionId,
		})
	} catch (err) {
		if (err === 'UserNotFound' || err === 'InvalidPassword') {
			/**
			 * Diferenciar usuário não encontrado de credenciais inválidas
			 * faz com que seja possível descobrir quais usuários estão
			 * cadastrados no database, por isso a mensagem é a mesma
			 */
			res.status(401).send({ error: 'NotAuthorized' })
		} else {
			/**
			 * Esse else pode ser chamado em situações onde não foi um erro interno
			 * do servidor, como uma entrada malformada
			 *
			 * @todo Fazer um error handling melhor
			 */
			console.error('Error on authentication', err)
			res.status(500).send({ error: 'InternalServerError' })
		}
	}
})

/** Middleware de autenticação */
router.use(authentication)

/**
 * Retorna se o usuário está autenticado ou não
 */
router.get('/authentication', async (req, res) => {
	const session = await Session.findOne({ userId: req.userId }, { token: true })
	res.send({ token: session?.token })
})

/**
 * Handler do request de desautenticação
 */
router.delete('/authentication', async (req, res) => {
	try {
		const session = await Session.findOneAndDelete({ userId: req.userId })
		if (!session) throw 'CookieNotFound'

		// Seta o cookie para expirar no passado, fazendo com o que browser o delete
		res.cookie('sessionId', '', { httpOnly: true, expires: new Date(0) })
		res.send({ message: 'Success' })
	} catch (err) {
		res.status(500).send({ error: 'InternalServerError' })
	}
})

export default router
