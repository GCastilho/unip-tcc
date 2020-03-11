import express from 'express'
import v1 from './v1'

const api = express.Router()

api.use('/v1', v1)

api.get('/', (_req, res) => {
	res.send({
		description: 'HTTP API subdomain',
		versions: [ 1 ]
	})
})

api.all('/*', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

export default api
