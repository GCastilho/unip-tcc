import express from 'express'
import user from './user'

const router = express.Router()

router.use('/currencies', (_req, res) => {
	res.send({
		currencies: ['nano', 'bitcoin']
	})
})

router.use('/transaction/:opid', (_req, res) => {
	res.send({ transaction: 'transaction:opid' })
})

router.use('/transaction', (_req, res) => {
	res.send({ transaction: 'transaction' })
})

router.use('/user', user)

router.use('/:err', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

router.use('/', (_req, res) => {
	res.send({
		version: 1.0,
		description: 'Entrypoint for the v1 of the HTTP API',
		deprecated: false,
		entries: {
			list: [ 'currencies', 'transaction', 'user' ],
			details: {
				currencies: {
					description: 'Detailed information about the supported currencies of the system',
					endpoint: true,
					auth: false,
					methods: [ 'GET' ]
				},
				transaction: {
					description: 'Informations about a transaction',
					endpoint: false,
					auth: true
				},
				user: {
					description: 'Entrypoint for requests specific to a user',
					endpoint: false,
					auth: true
				}
			}
		}
	})
})

export default router
