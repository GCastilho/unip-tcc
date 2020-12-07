import sirv from 'sirv'
import axios from 'axios'
import compression from 'compression'
import express, { json } from 'express'
import cookieParser from 'cookie-parser'
import { mainServerIp } from './utils/middlewares'
import { createProxyMiddleware } from 'http-proxy-middleware'
import * as sapper from '@sapper/server'

const { PORT, NODE_ENV } = process.env
const dev = NODE_ENV === 'development'

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
