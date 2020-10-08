import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import authentication from './authentication'
import { currencyNames } from '../../../libs/currencies'
import Person from '../../../db/models/person'
import Transaction from '../../../db/models/transaction'
import * as CurrencyApi from '../../../currencyApi'

const router = express.Router()

// Parsers
router.use(cookieParser())
router.use(bodyParser.json())

/**
 * Handler de registros de usuários
 */
router.post('/', async (req, res): Promise<any> => {
	if (!req.body.email || !req.body.password)
		return res.status(400).send({ error: 'BadRequest' })

	try {
		await Person.createOne(req.body.email, req.body.password)

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

/** Hanlder de autenticação de usuários */
router.use(authentication)

/**
 * Retorna todas as contas do usuario
 */
router.get('/accounts', async (req, res) => {
	const person = await Person.findById(req.userId)
		.selectAccounts()
		.orFail() as InstanceType<typeof Person>
	const account = {}
	for (const currency of currencyNames) {
		account[currency] = person.currencies[currency].accounts
	}
	res.send(account)
})

/**
 * Retorna todos os saldos do usuario
 */
router.get('/balances', async (req, res) => {
	const person = await Person.findById(req.userId)
		.selectBalances()
		.orFail() as InstanceType<typeof Person>
	const balance = {}
	for (const currency of currencyNames) {
		balance[currency] = {
			available: person.currencies[currency].balance.available.toFullString(),
			locked: person.currencies[currency].balance.locked.toFullString()
		}
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
		const { id: userId } = await Person.findById(req.userId, { _id: true })
			.orFail() as InstanceType<typeof Person>
		const tx = await Transaction.findById(req.params.opid)
			.orFail() as InstanceType<typeof Transaction>
		// Checa se o usuario da transação é o mesmo que esta logado
		if (tx.userId.toHexString() != userId) throw 'NotAuthorized'
		// Formata o objeto da transação
		res.send({
			opid:          tx.id,
			status:        tx.status,
			currency:      tx.currency,
			txid:          tx.txid,
			account:       tx.account,
			amount:       +tx.amount.toFullString(),
			fee:           tx.fee,
			type:          tx.type,
			confirmations: tx.confirmations,
			timestamp:     tx.timestamp.getTime()
		})
	} catch (err) {
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
	const { id: userId } = await Person.findById(req.userId, { _id: true })
		.orFail() as InstanceType<typeof Person>
	try {
		const tx = await Transaction.findById(req.params.opid, {
			userId: true,
			currency: true
		})
		if (!tx) throw 'NotFound'
		// Checa se o usuario da transação é o mesmo que esta logado
		if (tx.userId.toHexString() != userId) throw 'NotAuthorized'

		res.send({
			message: await CurrencyApi.cancellWithdraw(tx.userId, tx.currency, tx._id)
		})
	} catch (err) {
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
	const { id: userId } = await Person.findById(req.userId, { _id: true })
		.orFail() as InstanceType<typeof Person>
	/** Numero de transações que sera puladas */
	const skip: number = +req.query.skip || 0
	/** Filtro da query do mongo */
	const query = { userId } as any
	/** Filtro de transações por currency */
	const currency = currencyNames.find(currency => currency === req.query.currency)
	if (currency) query.currency = currency
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
		amount:       +tx.amount.toFullString(),
		fee:           tx.fee,
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
	const { _id: userId } = await Person.findById(req.userId, { _id: true })
		.orFail() as InstanceType<typeof Person>
	try {
		const currency = currencyNames.find(currency => currency === req.body.currency)
		/** Checa se os dados dados enviados pelo o usuario são do type correto */
		if (!currency
			|| typeof req.body.destination !== 'string'
			|| isNaN(+req.body.amount)
		) throw 'BadRequest'

		const opid = await CurrencyApi.withdraw(userId, currency, req.body.destination, +req.body.amount)
		res.send({ opid })
	} catch (err) {
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
		const person = await Person.findById(req.userId, { credentials: true })
		if (!person) throw 'UserNotFound'
		person.credentials.password = req.body.new
		await person.save()
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
router.all('*', (_req, res) => {
	res.status(404).send({
		error: 'NotFound',
		message: 'Endpoint not found'
	})
})

export default router
