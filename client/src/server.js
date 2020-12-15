import sirv from 'sirv'
import axios from 'axios'
import assert from 'assert'
import compression from 'compression'
import express, { json } from 'express'
import cookieParser from 'cookie-parser'
import { init } from './utils/currencies'
import { mainServerIp } from './utils/middlewares'
import { createProxyMiddleware } from 'http-proxy-middleware'

const { PORT, NODE_ENV } = process.env
const dev = NODE_ENV === 'development'

async function fetchCurrencies() {
	try {
		const { data } = await axios.get('/v1/currencies', { baseURL: mainServerIp })

		const currencies = {}
		assert(data instanceof Array, 'API did not respond a currencies request with an array')
		// Popula o objeto currencies usando o array retornado da API
		for (const currency of data) {
			assert(typeof currency.name == 'string')
			assert(typeof currency.code == 'string')
			assert(typeof currency.decimals == 'number')
			assert(typeof currency.fee == 'number')
			currencies[currency.name] = {
				code: currency.code,
				decimals: currency.decimals,
				fee: currency.fee,
			}
		}
		console.log('Sapper\'s currencies cache has been populated')
		return currencies
	} catch (err) {
		console.log('Error fetching currencies:', err.response ? err.response.statusText : err.code, 'trying again in 10 seconds...')
		// Timeout de 10s
		await (() => new Promise(resolve => setTimeout(resolve, 10000)))()
		return fetchCurrencies()
	}
}

fetchCurrencies().then(currencies => {
	// Inicializa o módulo de currencies do servidor
	init(currencies)
	return import('@sapper/server')
}).then(sapper => {
	express()
		.use(
			createProxyMiddleware('/socket.io', {
				logLevel: dev ? 'info' : 'warn',
				target: mainServerIp,
				ws: true,
			}),
			compression({ threshold: 0 }),
			sirv('static', { dev }),
			cookieParser(),
			json(),
			async (req, _res, next) => {
				// Checa se o usuário está autenticado com a API
				const { sessionId } = req.cookies
				if (typeof sessionId != 'string') return next()
				try {
					const { data } = await axios.get('/v1/user/authentication', {
						baseURL: mainServerIp,
						headers: {
							Authorization: sessionId
						}
					})
					req.token = data.token
					next()
				} catch (err) {
					if (err.response && err.response.status == 401) next()
					else next(err) // Main server is offline or unreachable
				}
			},
			sapper.middleware({
				session: req => {
					return {
						loggedIn: typeof req.token == 'string',
						token: req.token
					}
				}
			}),
		)
		.listen(PORT, err => {
			if (err) console.log('error', err)
		})
}).catch(err => {
	console.error('Error initializing sapper:', err)
})
