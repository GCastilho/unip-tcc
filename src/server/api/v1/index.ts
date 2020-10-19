import cors from 'cors'
import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import user from './user'
import market from './market'
import { currencies } from '../../../libs/currencies'

const router = express.Router()

/** Habilita o CORS para requests autenticados vindos de qualquer endereço */
router.use(cors({ credentials: true, origin: true }))

// Parsers
router.use(cookieParser())
router.use(bodyParser.json())

/**
 * Redireciona todas as chamadas para módulo externos
 */
router.use('/user', user)
router.use('/market', market)

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
