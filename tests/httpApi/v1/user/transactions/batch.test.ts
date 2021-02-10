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
import type { SuportedCurrencies } from '../../../../../src/libs/currencies'

chai.use(chaiAsPromised)

const app = express()
app.use(api)

type TxType = InstanceType<typeof Transaction>['type'];

describe('Testing fetch of multiple transactions on the HTTP API version 1', () => {
	let userId: ObjectId
	let authorization: string

	const user = {
		email: 'v1-test@example.com',
		password: 'userP@ss'
	}

	const notAuthorizedModel = {
		error: 'NotAuthorized',
		message: 'A valid header \'Authorization\' is required to perform this operation'
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
			.map(tx => new Transaction(tx).save())

		await Promise.all(transactions)

		const res = await request(app)
			.post('/v1/user/authentication')
			.send(user)
			.expect(200)

		authorization = res.body.authorization
	})

	it('Should return Not Authorized if invalid or missing sessionId', async () => {
		const { body } = await request(app).get('/v1/user/transactions').send()
			.expect(401)
		expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
	})

	it('Should return an empty array if there is no transactions', async () => {
		await Person.createOne('empty-tx-user@email.com', 'emptyP@ss')
		const res = await request(app)
			.post('/v1/user/authentication')
			.send({
				email: 'empty-tx-user@email.com',
				password: 'emptyP@ss'
			}).expect(200)

		const _authorization = res.body.authorization

		const { body } = await request(app)
			.get('/v1/user/transactions')
			.set({ Authorization: _authorization })
			.send()
			.expect(200)

		expect(body).to.be.an('array').that.have.lengthOf(0)
	})

	it('Should return a list of the last 10 transactions of the user', async () => {
		const transactions = await Transaction.find({})
			.sort({ timestamp: -1 })
			.limit(10)
		const { body } = await request(app)
			.get('/v1/user/transactions')
			.set({ authorization })
			.send()
			.expect(200)

		expect(body).to.be.an('array')
		expect(body.length).to.be.lte(10)
		transactions.forEach(tx_stored => {
			const tx_received = body.find(e => e.opid == tx_stored.id)
			expect(tx_received).to.be.an('object', `Transaction with opid ${tx_stored._id} not sent`)
			expect(tx_received).to.deep.equals(tx_stored.toJSON())
		})
	})

	it('Should skip first 10 transactions', async () => {
		const transactions = await Transaction.find({})
			.sort({ timestamp: -1 })
			.skip(10)
			.limit(10)
		const { body } = await request(app)
			.get('/v1/user/transactions')
			.set({ authorization })
			.query({ skip: 10 })
			.send()
			.expect(200)

		expect(body).to.be.an('array')
		expect(body.length).to.be.lte(10)
		transactions.forEach(tx_stored => {
			const tx_received = body.find(e => e.opid == tx_stored._id.toHexString())
			expect(tx_received).to.be.an('object', `Transaction with opid ${tx_stored._id} not sent`)
			expect(tx_received).to.deep.equals(tx_stored.toJSON())
		})
	})
})
