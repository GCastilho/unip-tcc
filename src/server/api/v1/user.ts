import express from 'express'
import cookieParser from 'cookie-parser'
import Transaction from '../../../db/models/transaction'
import * as UserApi from '../../../userApi'
import * as CurrencyApi from '../../../currencyApi'

const router = express.Router()

// Parsers
router.use(cookieParser())
router.use(express.json())

/**
 * Call para logar na api
 */
router.post('/login', async (req, res) => {
	try {
		console.log(req.body)
		if (!req.cookies.sessionId || !req.body.sessionId) throw 'Cookie Not Found' // adicionado verificação se existe no body o sessionId
		req.user = await UserApi.findUser.byCookie(req.cookies.sessionId || req.body.sessionId)
		res.cookie('sessionId', req.cookies.sessionId || req.body.sessionId,{domain:'.localhost:3000'}) //reaplica o cookie sessionId
		res.status(200)
	} catch(err) {
		res.status(401).send({
			error: 'NotAuthorized',
			message: 'A valid cookie \'sessionId\' needs to be informed in body to perform this operation'
		})
	}
})

/**
 * Checa se você está logado
 */
router.use(async (req, res, next) => {
	try {
		if (!req.cookies.sessionId || !req.body.sessionId) throw 'Cookie Not Found' // adicionado verificação se existe no body o sessionId
		req.user = await UserApi.findUser.byCookie(req.cookies.sessionId || req.body.sessionId)
		res.cookie('sessionId', req.cookies.sessionId || req.body.sessionId,) //reaplica o cookie sessionId
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
	const account = {}
	for (const currency of CurrencyApi.currencies) {
		account[currency] = req.user?.getAccounts(currency)
	}
	res.send(account)
})

/**
 * Retorna todos os saldos do usuario
 */
router.get('/balances', (req, res) => {
	const balance = {}
	for (const currency of CurrencyApi.currencies) {
		balance[currency] = req.user?.getBalance(currency, true)
	}
	res.send(balance)
})

//Não implementado
router.get('/info', async (_req, res) => {
	res.send({ error: 'NotImplemented' })
})

/**
 * Retorna uma transação especifica do usuario
 */
router.get('/transactions/:opid', async (req, res) => {
	try {
		const tx = await Transaction.findById(req.params.opid)
		if (!tx) throw 'NotFound'
		// Checa se o usuario da transação é o mesmo que esta logado
		if (tx.user.toHexString() !== req.user?.id.toHexString()) throw 'NotAuthorized'
		// Formata o objeto da transação
		res.send({
			opid:          tx._id.toHexString(),
			status:        tx.status,
			currency:      tx.currency,
			txid:          tx.txid,
			account:       tx.account,
			amount:        tx.amount.toFullString(),
			type:          tx.type,
			confirmations: tx.confirmations,
			timestamp:     tx.timestamp.getTime()
		})
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
	/** Numero de transações que sera puladas */
	const skip: number = +req.query.skip || 0
	/** Filtro de transações por currency */
	const currency = CurrencyApi.currencies.find(currency => currency === req.query.currency)
	/** Filtro da query do mongo */
	const query = currency ? { user: req.user?.id, currency } : { user: req.user?.id }
	/**
	 * As 10 mais recentes transações do usuário,
	 * filtrado de acordo com a query e pulando de acordo com skip
	 */
	const txs = await Transaction.find(query, null, {
		sort: { timestamp: -1 },
		limit: 10,
		skip
	})
	const formattedTransactions = txs.map(tx => ({
		opid:          tx._id.toHexString(),
		status:        tx.status,
		currency:      tx.currency,
		txid:          tx.txid,
		account:       tx.account,
		amount:        tx.amount.toFullString(),
		type:          tx.type,
		confirmations: tx.confirmations,
		timestamp:     tx.timestamp.getTime()
	}))
	res.send(formattedTransactions)
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
			|| isNaN(+req.body.amount)
		) throw 'BadRequest'

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
