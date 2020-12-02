import axios from 'axios'
import { errorHandler, mainServerIp } from '../../utils/middlewares'
import type { Request, Response } from 'express'
import type { SuportedCurrencies } from '../../../../src/libs/currencies'

/** O type do objeto retornado pelo GET dessa rota */
export type Accounts = {
	[key in SuportedCurrencies]: string[]
}

export async function get(req: Request, res: Response) {
	try {
		const response = await axios.get('/v1/user/accounts', {
			baseURL: mainServerIp,
			headers: {
				Authorization: req.cookies.sessionId
			}
		})

		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}
