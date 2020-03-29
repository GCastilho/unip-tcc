import express from 'express'
import * as UserApi from '../../../userApi'
import * as CurrencyApi from '../../../currencyApi'
import Transaction from '../../../db/models/transaction'
import cookieParser from 'cookie-parser'

const router = express.Router()

// Parsers
router.use(cookieParser())
router.use(express.json())

/**
 * Checa se você está logado
 */
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

/**
 * Retorna todas as contas do usuario
 */
router.get('/accounts', (req, res) => {
	const account: object = {}
	for (const currency of CurrencyApi.currencies) {
		account[currency] = req.user?.getAccounts(currency)
	}
	res.send(account)
})

/**
 * Retorna todos os saldos do usuario
 */
router.get('/balances', (req, res) => {
	const balance: object = {}
	for (const currency of CurrencyApi.currencies) {
		balance[currency] = req.user?.getBalance(currency, true)
	}
	res.send(balance)
})

//Não implementado
router.get('/info', async (_req, res) => {
	res.send({ info: 'info' })
})

/**
 * Retorna uma transação especifica do usuario
 */
router.get('/transactions/:opid', async (req, res) => {
	try {
		const transactions = await Transaction.findById(req.params.opid)
		if (!transactions) throw 'NotFound'
		// Checa se o usuario da transação é o mesmo que esta logado
		if (transactions.user.toHexString() !== req.user?.id.toHexString()) throw 'NotAuthorized'
		// Coloca as transações o formato certo
		const tx = {
			opid:			transactions._id.toHexString(),
			status:			transactions.status,
			currency:		transactions.currency,
			txid:			transactions.txid,
			account:		transactions.account,
			amount:			transactions.amount.toFullString(),
			type:			transactions.type,
			confirmations:	transactions.confirmations,
			timestamp:		transactions.timestamp.getTime()
		}
		res.send(tx)
	} catch(err) {
		if (err === 'NotFound') {
			res.status(404).send({
				error: 'NotFound',
				message: 'Transaction not found'
			})
		} else {
			res.status(401).send({
				error: 'NotAuthorized',
				message: 'This transaction does not belong to your account'
			})
		}
	}
})

/**
 * Retorna uma lista de transações do usuário
 */
router.get('/transactions', async (req, res) => {
	/** Indica o numero de transações que sera puladas */
	const skip: number = +req.query.skip || 0
	/** Checa se a currency é surportada, se não for suportada ou ela for undefined ou null, ela retora undefined */
	const currency = CurrencyApi.currencies.find(currency => currency === req.query.currency)
	/** Chega se o filtro currency foi enviado */
	const query = currency ? {
		user: req.user?.id,
		currency: currency
	} : { user: req.user?.id }
	/**
	 * Pega as transações 10 ultimas transações no banco de dados por currency.
	 * Se req.query.currency for vazio ele pegara todas as transações
	 * */
	const transactions = await Transaction.find(query, null,{
		sort : { timestamp: -1 },
		limit: 10,
		skip
	})
	/** Coloca as transações o formato certo */
	const tx_received: object[] = []
	for (const transaction of transactions) {
		tx_received.push({
			opid:			transaction._id.toHexString(),
			status:			transaction.status,
			currency:		transaction.currency,
			txid:			transaction.txid,
			account:		transaction.account,
			amount:			transaction.amount.toFullString(),
			type:			transaction.type,
			confirmations:	transaction.confirmations,
			timestamp:		transaction.timestamp.getTime()
		})
	}
	res.send(tx_received)
})

/**
 * Faz o request 'withdraw' usando as informações do req.body
 */
router.post('/transactions', async (req, res) => {
	try {
		const currency = CurrencyApi.currencies.find(currency => currency === req.body.currency)
		/** Checa se os dados dados enviados pelo o usuario são do type correto */
		if (!currency
			|| !req.user
			|| typeof req.body.destination !== 'string'
			|| isNaN(+req.body.amount)) throw 'BadRequest'

		const opid = await CurrencyApi.withdraw(req.user, currency, req.body.destination, +req.body.amount)
		res.send({ opid })
	} catch(err) {
		if (err === 'NotEnoughFunds') {
			res.status(403).send({
				error: 'NotEnoughFunds',
				message: 'There are not enough funds on your account to perform this operation'
			})
		} else {
			res.status(400).send({
				error: 'BadRequest',
				message: 'The request is malformed'
			})
		}
	}
})

/**
 * Retorna informações sobre os subpath de /user
 */
router.get('/', (_req, res) => {
	res.send({
		description: 'Entrypoint for requests specific to a user',
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
