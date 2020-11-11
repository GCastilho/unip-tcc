import sirv from 'sirv'
import axios from 'axios'
import express from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import * as sapper from '@sapper/server'

const { PORT, NODE_ENV } = process.env
const dev = NODE_ENV === 'development'

express()
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		cookieParser(),
		async (req, _res, next) => {
			// Checa se o usuário está autenticado com a API
			const { sessionId } = req.cookies
			if (typeof sessionId != 'string') return next()
			try {
				const { data } = await axios.get('/v1/user/authentication', {
					baseURL: '__API_URL__',
					headers: {
						Cookie: `sessionId=${sessionId}`
					}
				})
				req.token = data.token
				next()
			} catch (err) {
				if (err.response.status == 401) next()
				else next(err)
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
