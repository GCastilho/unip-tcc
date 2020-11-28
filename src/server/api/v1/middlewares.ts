import Session from '../../../db/models/session'
import type { Request, Response, NextFunction } from 'express'

/** Express middleware para a autenticação de requests */
export async function authentication(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (
			!req.cookies.sessionId &&
			!req.headers.authorization
		) throw 'Cookie Not Found'
		const session = await Session.findOne({
			sessionId: req.headers.authorization || req.cookies.sessionId
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
}
