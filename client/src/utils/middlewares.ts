import axios from 'axios'
import type { Request, Response, NextFunction } from 'express'
import type { AxiosError, AxiosResponse } from 'axios'

export const mainServerIp = process.env.MAIN_SERVER_IP || 'http://127.0.0.1:3001'

export function errorHandler(
	res: Response,
	err: AxiosError,
) {
	if (err.response) {
		// Request made and server responded
		res.status(err.response.status).send(err.response.data)
	} else if (err.request) {
		// The request was made but no response was received
		res.status(504).send({
			error: 'API Server Timeout',
			message: 'The API server did not respond our request'
		})
	} else {
		// Something happened in setting up the request that triggered an Error
		console.error('Unknown error on error handler middleware:', err)
		res.status(500).send({
			error: 'Internal Server Error'
		})
	}
}

/**
 * Retorna um middleware do express para redirecionar requests ao main server
 * @param method O método HTTP do request que será feito
 * @param url A url do main server que deve ser requisitada
 */
export function apiRequest(
	method: 'get'|'post'|'patch'|'delete',
	url: string,
) {
	return async function<T>(req: Request, res: Response, next: NextFunction) {
		/** Envia ao sapper todos os requests que não esperam JSON como resposta */
		if (!req.headers.accept.includes('application/json')) return next()

		const params = url.match(new RegExp(':.+?(?=/|$)', 'g'))
		if (params) {
			for (const param of params) {
				url = url.replace(param, req.params[param.slice(1)])
			}
		}

		const Axios = axios.create({
			baseURL: mainServerIp,
			params: req.query,
			headers: {
				Authorization: `${req.cookies.sessionId}`
			}
		})

		try {
			let response: AxiosResponse<T>
			if (method == 'get' || method == 'delete') {
				response = await Axios[method](url)
			} else {
				response = await Axios[method](url, req.body)
			}

			res.status(response.status).send(response.data)
		} catch (err) {
			errorHandler(res, err)
		}
	}
}
