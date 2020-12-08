import Session from '../../../db/models/session'
import type { Request, Response, NextFunction } from 'express'

/** Express middleware para a autenticação de requests */
export async function authentication(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.headers.authorization) throw 'AuthorizationNotFound'
		const session = await Session.findOne({
			sessionId: req.headers.authorization
		}, {
			userId: true
		})
		if (!session) throw 'AuthorizationNotFound'
		req.userId = session.userId
		next()
	} catch (err) {
		res.status(401).send({
			error: 'NotAuthorized',
			message: 'A valid header \'Authorization\' is required to perform this operation'
		})
	}
}
