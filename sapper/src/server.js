import sirv from 'sirv'
import express from 'express'
import compression from 'compression'
import * as sapper from '@sapper/server'
const proxy = require('express-http-proxy')

const { PORT, NODE_ENV, SERVER_PORT } = process.env
const dev = NODE_ENV === 'development'
const server_port = SERVER_PORT || 3001

express()
	.use(
		proxy(`http://127.0.0.1:${server_port}`, {
			/**
			 * métodos GET são enviados ao sapper
			 * socket.io nosso tem um header 'path' !undefined
			 */
			filter: req => req.method !== 'GET' || req.headers.path
		}),
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		sapper.middleware(),
	)
	.listen(PORT, err => {
		if (err) console.log('error', err)
	})
