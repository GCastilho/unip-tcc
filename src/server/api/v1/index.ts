import express from 'express'
import user from './user'
import * as CurrencyApi from '../../../currencyApi'

const router = express.Router()

router.get('/currencies', (_req, res) => {
	res.send(CurrencyApi.currenciesDetailed)
})

router.use('/user', user)

router.get('/', (_req, res) => {
	res.send({
		version: 1.0,
		description: 'Entrypoint for the v1 of the HTTP API',
		deprecated: false,
		entries: [
			{
				path: 'currencies',
				description: 'Request informations about the currencies supported by the API',
				request: [{
					method: 'GET',
					returns: 'Detailed information about the supported currencies of the API'
				}],
				auth: false
			},
			{
				path: 'user',
				description: 'Entrypoint for requests specific to a user',
				request: [{
					method: 'GET',
					returns: 'Informations about the entrypoint'
				}],
				auth: false
			}
		]
	})
})

router.all('/*', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

export default router
