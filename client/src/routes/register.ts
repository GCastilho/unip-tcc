import axios from 'axios'
import { errorHandler, mainServerIp } from '../utils/middlewares'
import type { Request, Response } from 'express'

export async function post(req: Request, res: Response) {
	try {
		const response = await axios.post('/v1/user', req.body, {
			baseURL: mainServerIp
		})
		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}
