import axios from 'axios'
import { errorHandler, mainServerIp } from '../../../utils/middlewares'
import type { Request, Response } from 'express'

// ESSA ROTA NÃO EXISTE NA API
export async function get(req: Request, res: Response) {
	try {
		const response = await axios.get(`/v1/market/orderbook/${req.params.opid}`, {
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

export async function del(req: Request, res: Response) {
	try {
		const response = await axios.delete(`/v1/market/orderbook/${req.params.opid}`, {
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
