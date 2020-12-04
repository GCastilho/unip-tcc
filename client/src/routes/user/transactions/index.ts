import axios from 'axios'
import { errorHandler, mainServerIp } from '../../../utils/middlewares'
import type { NextFunction, Request, Response } from 'express'
import type { TxInfo } from '../../../../../interfaces/transaction'

/** O type do objeto de dentro do array retornado pelo GET dessa rota */
export type TxJSON = TxInfo

export async function get(req: Request, res: Response, next: NextFunction) {
	/**
	 * Como essa rota colide com a rota da página, esse check envia ao sapper
	 * todos os requests que não esperam JSON como resposta
	 */
	if (!req.headers.accept.includes('application/json')) return next()
	try {
		const response = await axios.get('/v1/user/transactions', {
			baseURL: mainServerIp,
			params: { skip: req.params.storeLength },
			headers: {
				Authorization: req.cookies.sessionId
			}
		})

		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}
