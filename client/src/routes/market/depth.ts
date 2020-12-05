import axios from 'axios'
import { errorHandler, mainServerIp } from '../../utils/middlewares'
import type { Request, Response } from 'express'

/** O type do objeto retornado pelo GET dessa rota */
export type { MarketDepth } from '../../../../interfaces/market'

export async function get(req: Request, res: Response) {
	try {
		const response = await axios.get('/v1/market/orderbook/depth', {
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