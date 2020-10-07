import express from 'express'
import Person from '../../../db/models/person'
import Session from '../../../db/models/session'
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
		 * sucedidas, seta o cookie no header e retorna o token
		 *
		 * @todo cookie ter tempo de expiração
		 */
		res.cookie('sessionId', session.sessionId, { httpOnly: true, sameSite: 'none' })
		res.send({ token: session.token })
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

/**
 * Handler de autenticação
 */
router.use(async (req, res, next) => {
	try {
		if (!req.cookies.sessionId) throw 'Cookie Not Found'
		const session = await Session.findOne({
			sessionId: req.cookies.sessionId
		}, {
			userId: true
		})
		if (!session) throw 'CookieNotFound'
		req.userId = session.userId
		next()
	} catch (err) {
		res.status(401).send({
			error: 'NotAuthorized',
			message: 'A valid cookie \'sessionId\' is required to perform this operation'
		})
	}
})

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
