import express from 'express'
import * as UserApi from '../../../userApi'
import * as CurrencyApi from '../../../currencyApi'
//import Transaction from '../../../db/models/transaction'
import cookieParser from 'cookie-parser'

let account: object
let balance: object

const router = express.Router()

router.use(cookieParser())

router.use(async (req, res, next) => {
	try {
		if (!req.cookies.sessionId) throw 'Cookie Not Found'
		req.user = await UserApi.findUser.byCookie(req.cookies.sessionId)
		next()
	} catch(err) {
		res.status(401).send({
			error: 'NotAuthorized',
			message: 'A valid cookie \'sessionId\' needs to be informed to perform this operation'
		})
	}
})

router.get('/accounts', async (req, res) => {
	try {
		for (const currency of CurrencyApi.currencies) {
			account[currency] = req.user?.getAccounts(currency)
		}
		res.send(account)
	} catch(err) {
		console.log(err)
	}
})

router.get('/balances', async (req, res) => {
	try {
		for (const currency of CurrencyApi.currencies) {
			balance[currency] = req.user?.getBalance(currency, true)
		}
		res.send(balance)
	} catch(err) {
		console.log(err)
	}
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
	res.status(404).send({
		error: 'NotFound',
		message: 'Endpoint not found'
	})
})

export default router
