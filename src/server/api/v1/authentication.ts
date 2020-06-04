import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import Session from '../../../db/models/session'
import * as randomstring from 'randomstring'
import * as UserApi from '../../../userApi'

const router = express.Router()

// Parsers
router.use(cookieParser())
router.use(bodyParser.json())

/**
 * Handler do request de autenticação
 */
router.post('/', async (req, res): Promise<any> => {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'BadRequest' })

	try {
		const user = await UserApi.findUser.byEmail(req.body.email)
		await user.checkPassword(req.body.password)

		const session = await Session.findOneAndUpdate({
			userId: user.id
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
		res.cookie('sessionId', session.sessionId, { httpOnly: true })
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
			res.status(500).send({ error: 'InternalServerError' })
		}
	}
})

/**
 * Handler do request de desautenticação
 */
router.delete('/', async (req, res) => {
	try {
		if (!req.cookies.sessionId) throw 'CookieNotFound'
		const session = await Session.findOneAndDelete({ cookie: req.cookies.sessionId })
		if (!session) throw 'CookieNotFound'

		// Seta o cookie para expirar no passado, fazendo com o que browser o delete
		res.cookie('sessionId', null, { expires: new Date(0) })
		res.send({ message: 'success' })
	} catch(err) {
		res.status(401).send({
			error: 'NotAuthorized',
			message: 'A valid cookie \'sessionId\' is required to perform this operation'
		})
	}
})

/**
 * Retorna informações sobre os subpath de /user
 */
router.get('/', (_req, res) => {
	res.send({
		description: 'Entrypoint for authentication requests. POST do authenticate, DELETE to deauthenticate'
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
