import express from 'express'
import root from './root'
import api from './api'

const app = express()
const server = require('http').Server(app)

// Permite subdomain funcionar no localhost
if (process.env.NODE_ENV !== 'production') {
	app.set('subdomain offset', 1)
}

app.use((_, res, next) => {
	res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
	res.header('Access-Control-Allow-Credentials','true')
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
	next()
})

// Redireciona para o subdomain adequado
app.use((req, res, next) => {
	switch(req.subdomains.pop()) {
	case(undefined):
		/** Request to the root domain */
		return root(req, res, next)
	case('api'):
		/** Request to the api subdomain */
		return api(req, res, next)
	default:
		return res.status(404).send()
	}
})

module.exports = server
