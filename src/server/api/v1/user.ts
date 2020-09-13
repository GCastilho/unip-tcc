import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import authentication from './authentication'
import Transaction from '../../../db/models/transaction'
import * as UserApi from '../../../userApi'
import * as CurrencyApi from '../../../currencyApi'

const router = express.Router()

// Parsers
router.use(cookieParser())
router.use(bodyParser.json())

/** Hanlder de autenticação de usuários */
router.use('/authentication', authentication)

/**
 * Handler de registros de usuários
 */
router.post('/', async (req, res): Promise<any> => {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'BadRequest' })

	try {
		await UserApi.createUser(req.body.email, req.body.password)

		/**
		 * @todo Enviar e-mail de confirmação de... e-mail e só liberar a conta
		 * quando confirmado
		 */
		res.status(201).send({ message: 'Success' })
	} catch (err) {
		if (err.code === 11000) {
			res.status(409).send({ error: 'Email already registered' })
		} else {
			res.status(500).send({ error: 'Internal server error' })
			console.error('Register error:', err)
		}
	}
})

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
			message: 'A valid cookie \'sessionId\' is required to perform this operation'
		})
	}
})

/**
 * Retorna todas as contas do usuario
 */
router.get('/accounts', async (req, res) => {
	const account = {}
	for (const currency of CurrencyApi.currencies) {
		account[currency] = await req.user?.getAccounts(currency)
	}
	res.send(account)
})

/**
 * Retorna todos os saldos do usuario
 */
router.get('/balances', async (req, res) => {
	const balance = {}
	for (const currency of CurrencyApi.currencies) {
		balance[currency] = await req.user?.getBalance(currency, true)
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
		if (tx.userId.toHexString() !== req.user?.id.toHexString()) throw 'NotAuthorized'
		// Formata o objeto da transação
		res.send({
			opid:          tx.id,
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

router.delete('/transactions/:opid', async (req, res) => {
	try {
		const tx = await Transaction.findById(req.params.opid, {
			userId: true,
			currency: true
		})
		if (!tx) throw 'NotFound'
		// Checa se o usuario da transação é o mesmo que esta logado
		if (tx.userId.toHexString() !== req.user?.id.toHexString()) throw 'NotAuthorized'

		res.send({
			message: await CurrencyApi.cancellWithdraw(tx.userId, tx.currency, tx._id)
		})
	} catch(err) {
		if (err === 'NotFound') {
			res.status(404).send({
				error: 'NotFound',
				message: 'No transactions was found with given opid'
			})
		} else if (err == 'NotAuthorized') {
			res.status(401).send({
				error: 'NotAuthorized',
				message: 'This transaction does not belong to your account'
			})
		} else if (err.code == 'OperationNotFound') {
			res.status(404).send(err)
		} else {
			res.status(500).send({ code: 'InternalServerError' })
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
	const query = currency ? { userId: req.user?.id, currency } : { userId: req.user?.id }
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
		opid:          tx.id,
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

router.patch('/password', async (req, res): Promise<any> => {
	if (!req.body.old || !req.body.new)
		return res.status(400).send({
			error: 'BadRequest',
			message: 'This request must contain a object with an \'old\' and \'new\' properties'
		})

	try {
		const user = await UserApi.findUser.byCookie(req.cookies['sessionId'])
		await user.checkPassword(req.body.old)
		await user.changePassword(req.body.new)
		res.send({ message: 'Password updated' })
	} catch (err) {
		if (err == 'UserNotFound' || err == 'InvalidPassword') {
			/**
			 * Diferenciar usuário não encontrado de credenciais inválidas
			 * faz com que seja possível descobrir quais usuários estão
			 * cadastrados no database, por isso a mensagem é a mesma
			 */
			res.status(401).send({ error: 'NotAuthorized' })
		} else {
			res.status(500).send({ error: 'InternalServerError' })
		}
	}
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
