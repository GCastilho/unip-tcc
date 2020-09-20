import express from 'express'
import user from './user'
import { currencies } from '../../../libs/currencies'

const router = express.Router()

/**
 * Retorna as currencies suportadas
 */
router.get('/currencies', (_req, res) => {
	const currenciesDetailed = currencies.map(currency => ({
		name: currency.name,
		code: currency.code,
		decimals: currency.decimals,
		fee: currency.fee
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
