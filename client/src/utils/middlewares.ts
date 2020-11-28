import type { AxiosError } from 'axios'

export function errorHandler(
	err: AxiosError,
): { code: number, response: Record<string, unknown> } {
	if (err.response) {
		// Request made and server responded
		return {
			code: err.response.status,
			response: err.response.data
		}
	} else if (err.request) {
		// The request was made but no response was received
		return {
			code: 504,
			response: {
				error: 'API Server Timeout',
				message: 'The API server did not respond our request'
			}
		}
	} else {
		// Something happened in setting up the request that triggered an Error
		console.error('Unknown error on error handler middleware:', err)
		return {
			code: 500,
			response: {
				error: 'Internal Server Error'
			}
		}
	}
}
