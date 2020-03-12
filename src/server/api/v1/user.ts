import express from 'express'
import * as UserApi from '../../../userApi'
import cookieParser from 'cookie-parser'

const router = express.Router()

router.use(cookieParser())

router.use(async (req, res, next) => {
	try {
		if (!req.cookies.sessionId) throw new Error('Not Authorized')
		const user = await UserApi.findUser.byCookie(req.cookies.sessionId)
		next()
	} catch(err) {
		res.status(401).send({
			error: 'Not Authorized',
			message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
		})
	}
})

router.get('/accounts', async (_req, res) => {
	res.send({ accounts: 'accounts' })
})

router.get('/balances', async (_req, res) => {
	res.send({ balances: 'balances' })
})

router.get('/info', async (_req, res) => {
	res.send({ info: 'info' })
})

router.get('/transactions/withdraw', async (_req, res) => {
	res.send({ withdraw: 'withdraw' })
})

router.get('/transactions/:opid', async (req, res) => {
	res.send(req.cookies)
})

router.get('/transactions', async (_req, res) => {
	res.send({ transaction: 'transactions' })
})

router.get('/', (_req, res) => {
	res.send({
		description: 'Entrypoint for requests specific to a user',
		entries: [
			{
				path: 'info',
				description: 'Request informations about the user',
				auth: true,
				requests: [{
					method: 'GET',
					returns: 'Informations about the user'
				}]
			},
			{
				path: 'accounts',
				description: 'Request a list of accounts of the user',
				auth: true,
				requests: [{
					method: 'GET',
					returns: 'List of accounts of all currencies that the user has',
				}]
			},
			{
				path: 'balances',
				description: 'Request the balances for all the currencies',
				auth: true,
				requests: [{
					method: 'GET',
					returns: 'List of balances of all currencies',
				}]
			},
			{
				path: 'transactions',
				description: 'Fetch, send and update transactions',
				auth: true,
				requests: [
					{
						method: 'GET',
						returns: 'List of transactions from the user',
						parametres: [
							{
								type: 'query',
								description: '',
								value: 'numeric',
								name: 'from'
							},
							{
								type: 'query',
								description: '',
								value: 'numeric',
								name: 'to'
							}
						]
					},
					{
						method: 'GET',
						returns: 'Informations about specific transaction',
						parametres: [
							{
								type: 'path',
								description: 'The opid of the transaction to request data from',
								value: 'string',
								name: 'opid'
							}
						]
					},
					{
						method: 'POST',
						description: 'Submit new transaction',
						returns: 'opid of the submitted transaction',
						parametres: [
							{
								type: 'body',
								description: 'Instructions to execute a withdraw of a currency',
								value: {}
							}
						]
					}
				],
			},
		]
	})
})

router.all('/*', (_req, res) => {
	res.status(404).send({ error: 'Not found' })
})

export default router
