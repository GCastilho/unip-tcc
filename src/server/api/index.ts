import express from 'express'
import v1 from './v1'

const api = express.Router()

api.use('/v1', v1)

api.use('/:err', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

api.use('/', (_req, res) => {
	res.send({
		description: 'HTTP API subdomain',
		versions: [ 1 ]
	})
})

export default api
