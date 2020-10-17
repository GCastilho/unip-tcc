import express from 'express'
import v1 from './v1'

const api = express.Router()

/**
 * Redireciona todas as chamadas para /v1 e manda para v1/index.ts
 */
api.use('/v1', v1)

/**
 * Retorna uma lista de API suportadas
 */
api.get('/', (_req, res) => {
	res.send({
		description: 'HTTP API subdomain',
		entries: ['v1']
	})
})

/**
 * Retorna NotFound se não for encontrado o path
 */
api.all('/*', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

export default api
