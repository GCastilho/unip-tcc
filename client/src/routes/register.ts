import axios from 'axios'
import { errorHandler } from '../utils/middlewares'
import type { Request, Response } from 'express'

const mainServerIp = process.env.MAIN_SERVER_IP || 'http://127.0.0.1:3001'

export async function post(req: Request, res: Response) {
	try {
		const response = await axios.post('/v1/user', req.body, {
			baseURL: mainServerIp
		})
		res.status(response.status).send(response.data)
	} catch (err) {
		const { code, response } = errorHandler(err)
		res.status(code).send(response)
	}
}
