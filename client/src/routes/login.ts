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

export async function del(req: Request, res: Response) {
	try {
		await axios.delete('/v1/user/authentication', {
			baseURL: mainServerIp,
			headers: {
				Authorization: req.cookies.sessionId
			}
		})

		// Seta o cookie para expirar no passado, fazendo com o que browser o delete
		res.cookie('sessionId', '', { httpOnly: true, expires: new Date(0) })
		res.send({ message: 'Deauthenticated' })
	} catch (err) {
		errorHandler(res, err)
	}
}
