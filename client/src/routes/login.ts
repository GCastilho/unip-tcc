import axios from 'axios'
import { errorHandler, mainServerIp } from '../utils/middlewares'
import type { Request, Response } from 'express'

const dev = process.env.NODE_ENV === 'development'
const sameSite = dev ? 'none' : 'strict'
const secure = !dev

export async function post(req: Request, res: Response) {
	try {
		const { data } = await axios.post('/v1/user/authentication', req.body, {
			baseURL: mainServerIp
		})

		/** @todo cookie ter tempo de expiração */
		res.cookie('sessionId', data.authorization, { httpOnly: true, sameSite, secure })
		res.status(200).send({ token: data.token })
	} catch (err) {
		errorHandler(res, err)
	}
}
