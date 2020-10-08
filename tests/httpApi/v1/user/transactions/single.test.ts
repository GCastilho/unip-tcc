import '../../../../../src/libs/extensions'
import express from 'express'
import request from 'supertest'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import randomstring from 'randomstring'
import { ObjectId } from 'mongodb'
import { currenciesObj, currencyNames } from '../../../../../src/libs/currencies'
import api from '../../../../../src/server/api'
import Person from '../../../../../src/db/models/person'
import Session from '../../../../../src/db/models/session'
import Transaction from '../../../../../src/db/models/transaction'
import * as CurrencyApi from '../../../../../src/currencyApi'
import type { SuportedCurrencies } from '../../../../../src/libs/currencies'

chai.use(chaiAsPromised)

const app = express()
app.use(api)

type TxType = InstanceType<typeof Transaction>['type'];

describe('Testing fetch of specific transaction on the HTTP API version 1', () => {
	let userId: ObjectId
	let sessionId: string

	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}

	const notAuthorizedModel = {
		error: 'NotAuthorized',
		message: 'A valid cookie \'sessionId\' is required to perform this operation'
	}

	before(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})
		await Transaction.deleteMany({})

		const { _id } = await Person.createOne(user.email, user.password)
		userId = _id

		// Cria 30 tx para cada currency, com amount e type
		const txData: [SuportedCurrencies, number, TxType][] = []
		for (let i = 1; i <= 30; i++) {
			for (const currency of currencyNames) {
				const txAmount = currenciesObj[currency].fee * 2 * Math.pow(i, Math.E)
				txData.push([currency, txAmount, i % 2 == 0 ? 'receive' : 'send'])
			}
		}

		const transactions: Promise<InstanceType<typeof Transaction>>[] = txData
			.map(([currency, amount, type]) => ({
				userId,
				status: amount % 2 == 0 ? 'pending' : 'confirmed',
				currency,
				txid: randomstring.generate(),
				account: `random-account-${currency}`,
				amount,
				type,
				confirmations: amount.toString().slice(-1),
				timestamp: new Date(),
			}))
			.map(tx => Transaction.create(tx))

		await Promise.all(transactions)

		const res = await request(app)
			.post('/v1/user/authentication')
			.send(user)
			.expect(200)

		expect(res.header['set-cookie']).to.be.an('array')
		sessionId = res.header['set-cookie'].map((cookies: string) => {
			const match = cookies.match(new RegExp('(^| )sessionId=([^;]+)'))
			return match ? match[2] : ''
		})[0]
	})

	it('Should return Not Authorized if invalid or missing sessionId', async () => {
		const { body } = await request(app)
			.get('/v1/user/transactions/a-opid')
			.send()
			.expect(401)
		expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
	})

	it('Should return Not Authorized if transaction is from a different user', async () => {
		/** Set do opid das transações do outro usuário */
		const opidSet = new Set<ObjectId>()

		// Cria o outro usuário
		const person = await Person.createOne('randomUser-v1-test@email.com', 'randomPass')
		for (const currency of currencyNames) {
			// @ts-expect-error Mongo fará a conversão automática
			person.currencies[currency].balance.available = 50
			await person.save()
			const opid = await CurrencyApi.withdraw(person._id, currency, `other-account-${currency}`, 12.5)
			opidSet.add(opid)
		}

		// Tenta requisitar info das txs do outro usuário
		for (const opid of opidSet) {
			const { body } = await request(app)
				.get(`/v1/user/transactions/${opid.toHexString()}`)
				.set('Cookie', [`sessionId=${sessionId}`])
				.send()
				.expect(401)

			expect(body).to.be.an('object').that.deep.equals({
				error: 'NotAuthorized',
				message: 'This transaction does not belong to your account'
			})
		}
	})

	it('Should return informations about a transaction', async () => {
		const transactions = await Transaction.find({ userId }).limit(10)
		// Testa pelo recebimento individual das transações
		for (const tx of transactions) {
			const { body } = await request(app)
				.get(`/v1/user/transactions/${tx.id}`)
				.set('Cookie', [`sessionId=${sessionId}`])
				.send()
				.expect('Content-Type', /json/)
				.expect(200)

			expect(body).to.be.an('object')
			expect(body).to.deep.equals(tx.toJSON())
		}
	})
})
