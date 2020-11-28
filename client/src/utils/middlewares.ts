import type { Response } from 'express'
import type { AxiosError } from 'axios'

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
