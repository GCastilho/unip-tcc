import '../../../../../src/libs/extensions'
import express from 'express'
import request from 'supertest'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { ObjectId, Decimal128 } from 'mongodb'
import { currencyNames } from '../../../../../src/libs/currencies'
import api from '../../../../../src/server/api'
import Person from '../../../../../src/db/models/person'
import Session from '../../../../../src/db/models/session'
import Transaction from '../../../../../src/db/models/transaction'
import * as CurrencyApi from '../../../../../src/currencyApi'

chai.use(chaiAsPromised)

const app = express()
app.use(api)

describe('Testing withdraw and cancellWithdraw requests HTTP API version 1', () => {
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

	beforeEach(async () => {
		await Person.deleteMany({})
		await Session.deleteMany({})

		const { _id } = await Person.createOne(user.email, user.password)
		userId = _id

		for (const currency of currencyNames) {
			await Person.findByIdAndUpdate(userId, {
				$push: {
					[`currencies.${currency}.accounts`]: `${currency}-account`
				},
				$set: {
					[`currencies.${currency}.balance.available`]: 55.19764382,
					[`currencies.${currency}.balance.locked`]: 67.997
				}
			})
		}

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

	for (const currency of currencyNames) {
		describe(`When requesting withdraw for ${currency}`, () => {
			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				/** Número de transações antes da operação */
				const txSavedBefore = (await Transaction.find({})).length
				const { body } = await request(app)
					.post('/v1/user/transactions')
					.send({
						currency,
						destination: `account-destination-${currency}`,
						amount: 1
					})
					.expect(401)

				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
				// Checa se a transação foi agendada
				expect(await Transaction.find({})).to.have.lengthOf(txSavedBefore)
			})

			it('Should return Bad Request if the request is malformed')

			it('Should return NotEnoughFunds if amount is greater than the available balance', async () => {
				const person = await Person.findById(userId)
				const { available } = person.currencies[currency].balance
				const { body } = await request(app)
					.post('/v1/user/transactions')
					.set('Cookie', [`sessionId=${sessionId}`])
					.send({
						currency,
						destination: `account-destination-${currency}`,
						amount: +available + 10
					})
					.expect('Content-Type', /json/)
					.expect(403)

				expect(body).to.be.an('object').that.deep.equals({
					error: 'NotEnoughFunds',
					message: 'There are not enough funds on your account to perform this operation'
				})
			})

			it('Should execute a withdraw request', async () => {
				const { body } = await request(app)
					.post('/v1/user/transactions')
					.set('Cookie', [`sessionId=${sessionId}`])
					.send({
						currency,
						destination: `account-destination-${currency}`,
						amount: 2
					})
					.expect('Content-Type', /json/)
					.expect(200)

				expect(body).to.be.an('object')
				expect(body.opid).to.be.a('string')
				// Checa de uma transação com esse opid existe
				const tx = await Transaction.findById(body.opid)
				expect(tx).to.be.an('object')
				expect(tx.currency).to.equals(currency)
				expect(tx.account).to.equal(`account-destination-${currency}`)
				expect(tx.amount.toFullString()).to.equal((2 - tx.fee).toString())
			})
		})

		describe(`When requesting to cancell a withdraw request for ${currency}`, () => {
			let opid: ObjectId

			beforeEach(async () => {
				const person = await Person.findById(userId).selectBalances([currency])
				person.currencies[currency].balance.available = Decimal128.fromNumeric(50)
				await person.save({ validateBeforeSave: false })
				opid = await CurrencyApi.withdraw(userId, currency, 'random-account', 40)
			})

			it('Should return Not Authorized if invalid or missing sessionId', async () => {
				/** Número de transações antes da operação */
				const txsBefore = await Transaction.find({})
				const { body } = await request(app)
					.delete(`/v1/user/transactions/${txsBefore[0].id}`)
					.send()
					.expect(401)

				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
				// Checa se nenhuma transação foi deletada
				expect(await Transaction.find({})).to.have.lengthOf(txsBefore.length)
			})

			it('Should return not found if no transaction to cancell was found', async () => {
				const { body } = await request(app)
					.delete('/v1/user/transactions/notExistentTxid')
					.send()
					.expect(401)

				expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			})

			it('Should request to cancell a transaction', async () => {
				const { body } = await request(app)
					.delete(`/v1/user/transactions/${opid.toHexString()}`)
					.send()
					.expect(401)

				expect(body).to.be.an('object').that
					.has.property('message').that.is.a('string')
			})
		})
	}
})
