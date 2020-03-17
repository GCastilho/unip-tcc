import express from 'express'
import * as UserApi from '../../../userApi'
import * as CurrencyApi from '../../../currencyApi'
import Transaction from '../../../db/models/transaction'
import cookieParser from 'cookie-parser'

let account: object
let balance: object

const router = express.Router()

router.use(cookieParser())

/**
 * Checa se você está logado
 */
router.use(async (req, res, next) => {
	if ( req.path === '/') return next()
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

//Working in progress
router.get('/transactions/:opid', async (req, res) => {
	try {
		const transactions = await Transaction.find({ _id: req.params.opid })
		if (transactions[0].user.toHexString() !== req.user?.id.toHexString()) throw 'NotAuthorized'
		const tx = {
			status:        transactions[0].status,
			currency:      transactions[0].currency,
			txid:          transactions[0].txid,
			account:       transactions[0].account,
			amount:       +transactions[0].amount.toFullString(),
			type:          transactions[0].type,
			confirmations: transactions[0].confirmations,
			timestamp:     transactions[0].timestamp.getTime()
		}
		res.send(tx)
	} catch(err) {
		res.status(401).send({
			error: 'NotAuthorized',
			message: 'This transaction does not belong to your account'
		})
	}
})

//TODO: consertar o erro "Cannot read property 'toHexString' of undefined"
router.get('/transactions', async (req, res) => {
	/** Indica o numero de transações que sera puladas */
	const skip: number = +req.query.skip || 0
	/**
	 * Pega as transações no banco de dados por currency
	 * Se req.query.currency for vazio ele pegara todas as transações
	 * */
	const transactions = await Transaction.find(req.query.currency ? { currency: req.query.currency } : {})
		.sort({ timestamp: -1 })

	res.send(transactions.slice(skip, skip + 10))
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
						returns: 'List of transactions from the user in descending order',
						parametres: [
							{
								type: 'query',
								description: 'Filter transactions by currency',
								value: 'string',
								name: 'currency'
							},
							{
								type: 'query',
								description: 'Skip first n results',
								value: 'numeric',
								name: 'skip'
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
								value: {
									currency: {
										type: 'string',
										description: 'Currency to withdraw from'
									},
									destination: {
										type: 'string',
										description: 'Address to send currency to'
									},
									amount: {
										type: 'numeric',
										description: 'Amount of currency to withdraw'
									}
								}
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
