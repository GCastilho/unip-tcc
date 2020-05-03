import express from 'express'
import user from './user'
import * as CurrencyApi from '../../../currencyApi'

const router = express.Router()

/**
 * Autoriza requests autenticados vindos da URL base
 */
router.use((req, res, next) => {
	// Workaround do CORS em diferentes ips; Remover qdo for para prod
	const host = req.hostname.replace('api.', '')
	const port = process.env.PORT == '3001' ? '3000' : process.env.PORT

	res.header('Access-Control-Allow-Origin', `http://${host}:${port}`)
	res.header('Access-Control-Allow-Credentials','true')
	res.header('Access-Control-Allow-Headers', 'Content-Type')
	next()
})

/**
 * Handler do preflight request
 */
router.options('*', function(_req, res) {
	res.sendStatus(200)
})

/**
 * Retorna as currencies suportadas
 */
router.get('/currencies', (_req, res) => {
	const currenciesDetailed = CurrencyApi.currencies.map(currency => ({
		name: currency,
		...CurrencyApi.detailsOf(currency)
	}))
	res.send(currenciesDetailed)
})

/**
 * Redireciona todas as chamadas para /user e manda para user.ts
 */
router.use('/user', user)

/**
 * Retorna informações sobre a API
 */
router.get('/', (_req, res) => {
	res.send({
		version: 1.0,
		description: 'Entrypoint for the v1 of the HTTP API',
		deprecated: false
	})
})

/**
 * Retorna NotFound se não for encontrado o path
 */
router.all('/*', (_req, res) => {
	res.status(404).send({
		error: 'NotFound',
		message: 'Endpoint not found'
	})
})

export default router