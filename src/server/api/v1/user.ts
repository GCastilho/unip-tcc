import express from 'express'

const router = express.Router()

router.use('/accounts', (_req, res) => {
	res.send({ accounts: 'accounts' })
})

router.use('/balances', (_req, res) => {
	res.send({ balances: 'balances' })
})

router.use('/info', (_req, res) => {
	res.send({ info: 'info' })
})

router.use('/withdraw', (_req, res) => {
	res.send({ withdraw: 'withdraw' })
})

router.use('/:err', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

router.use('/', (_req, res) => {
	res.send({ paths: [
		'accounts',
		'balances',
		'info',
		'withdraw'
	]})
})

export default router
