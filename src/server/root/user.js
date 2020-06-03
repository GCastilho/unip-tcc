const Router = require('express').Router()
const bodyParser = require('body-parser')
const cookieparser = require('cookie-parser')
const userApi = require('../../userApi')

Router.use(bodyParser.json({ extended: true }))
Router.use(cookieparser())

Router.post('/changepass', async function(req, res) {
	if (!req.body.oldPassword || !req.body.newPassword)
		return res.status(400).send({
			error: 'BadRequest',
			message: 'This request must contain a object with a oldPassword and newPassword properties'
		})

	try {
		const user = await userApi.findUser.byCookie(req.cookies['sessionId'])
		await user.checkPassword(req.body.oldPassword)
		await user.changePassword(req.body.newPassword)
		res.send({ message: 'Password updated' })
	} catch (err) {
		switch (err) {
		case ('CookieNotFound'):
			res.status(401).send({
				error: 'NotLoggedIn',
				message: 'You must be logged in perform this operation'
			})
			break
		case ('UserNotFound'):
		case ('InvalidPassword'):
			/**
			 * Diferenciar usuário não encontrado de credenciais inválidas
			 * faz com que seja possível descobrir quais usuários estão
			 * cadastrados no database, por isso a mensagem é a mesma
			 */
			res.status(401).send({ error: 'NotAuthorized' })
			break
		default:
			res.status(500).send({ error: 'InternalServerError' })
		}
	}
})

module.exports = Router
