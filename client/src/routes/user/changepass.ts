import axios from 'axios'
import { errorHandler, mainServerIp } from '../../utils/middlewares'
import type { Request, Response } from 'express'

export async function patch(req: Request, res: Response) {
	try {
		const response = await axios.patch('/v1/user/password', req.body, {
			baseURL: mainServerIp
		})
		res.status(response.status).send(response.data)
	} catch (err) {
		errorHandler(res, err)
	}
}
