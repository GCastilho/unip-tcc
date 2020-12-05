import axios from 'axios'
import { errorHandler, mainServerIp } from '../../../utils/middlewares'
import type { Request, Response } from 'express'

/** O type do objeto de dentro do array retornado pelo GET dessa rota */
export type { MarketOrder } from '../../../../../interfaces/market'

export async function get(req: Request, res: Response) {
	try {
		const response = await axios.get('/v1/market/orderbook', {
			baseURL: mainServerIp,
			params: req.params,
			headers: {
				Authorization: req.cookies.sessionId
			}
		})

		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}

export async function post(req: Request, res: Response) {
	try {
		const response = await axios.post('/v1/market/orderbook', req.body, {
			baseURL: mainServerIp,
			params: req.params,
			headers: {
				Authorization: req.cookies.sessionId
			}
		})

		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}
