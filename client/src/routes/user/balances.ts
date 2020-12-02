import axios from 'axios'
import { errorHandler, mainServerIp } from '../../utils/middlewares'
import type { Request, Response } from 'express'
import type { SuportedCurrencies } from '../../../../src/libs/currencies'

/** O type do objeto retornado pelo GET dessa rota */
export type Balances = {
	[key in SuportedCurrencies]: {
		available: number
		locked: number
	}
}

export async function get(req: Request, res: Response) {
	try {
		const response = await axios.get('/v1/user/balances', {
			baseURL: mainServerIp,
			headers: {
				Authorization: req.cookies.sessionId
			}
		})

		// Converte os saldos para number
		for (const currency in response.data) {
			for (const key in response.data[currency]) {
				response.data[currency][key] = Number(response.data[currency][key])
			}
		}

		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}
