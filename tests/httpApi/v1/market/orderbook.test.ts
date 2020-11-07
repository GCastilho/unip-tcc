import '../../../../src/libs/extensions'
import sinon from 'sinon'
import express from 'express'
import request from 'supertest'
import randomstring from 'randomstring'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
import { ImportMock } from 'ts-mock-imports'
import Session from '../../../../src/db/models/session'
import api from '../../../../src/server/api'
import * as MarketApi from '../../../../src/marketApi'
import type { SinonStub } from 'sinon'

/** Mock do método 'add' da marketApi */
type MockAdd = SinonStub<Parameters<typeof MarketApi['add']>>;
type MockRemove = SinonStub<Parameters<typeof MarketApi['remove']>>;
type MockGetDepth = SinonStub<Parameters<typeof MarketApi['getMarketDepth']>>;
type MockGetPrice = SinonStub<Parameters<typeof MarketApi['getMarketPrice']>>;

const app = express()
app.use(api)

describe('Testing orderbook endpoint for HTTP API version 1', () => {
	let sessionId: string

	const notAuthorizedModel = {
		error: 'NotAuthorized',
		message: 'A valid cookie \'sessionId\' is required to perform this operation'
	}

	before(async () => {
		const session = await Session.create({
			userId: new ObjectId(),
			sessionId: randomstring.generate({ length: 128 }),
			token: randomstring.generate({ length: 128 }),
			date: new Date()
		})
		sessionId = session.sessionId
	})

	describe('When sending a new order', () => {
		let spy: MockAdd

		beforeEach(() => {
			spy = ImportMock.mockFunction(MarketApi, 'add', new ObjectId()) as MockAdd
		})

		afterEach(() => {
			spy.restore()
		})

		it('Should call the MarketApi to insert a new order', async () => {
			const { body } = await request(app)
				.post('/v1/market/orderbook')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send({
					owning: {
						currency: 'bitcoin',
						amount: 1
					},
					requesting: {
						currency: 'nano',
						amount: 0.5
					}
				})
				.expect('Content-Type', /json/)
				.expect(201)
			expect(body).to.be.an('object').that
				.haveOwnProperty('opid').that.is.a('string')

			sinon.assert.calledOnce(spy)

			const [userId, order] = spy.getCall(0).args
			expect(userId).to.be.instanceOf(ObjectId)
			expect(order).to.be.an('object')
			expect(order).to.deep.equal({
				owning: {
					currency: 'bitcoin',
					amount: 1
				},
				requesting: {
					currency: 'nano',
					amount: 0.5
				}
			})
		})

		it('Should return Not Authorized if invalid or missing sessionId', async () => {
			const { body } = await request(app)
				.post('/v1/market/orderbook')
				.send({})
				.expect(401)
			expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			sinon.assert.notCalled(spy)
		})
	})

	describe('When deleting an existent order', () => {
		let spy: MockRemove

		beforeEach(() => {
			spy = ImportMock.mockFunction(MarketApi, 'remove') as MockRemove
		})

		afterEach(() => {
			spy.restore()
		})

		it('Should call the MarketApi to remove an existing order', async () => {
			const requestOpid = new ObjectId()

			const { body } = await request(app)
				.delete(`/v1/market/orderbook/${requestOpid}`)
				.set('Cookie', [`sessionId=${sessionId}`])
				.send()
				.expect('Content-Type', /json/)
				.expect(200)
			expect(body).to.be.an('object').that
				.haveOwnProperty('message').that.is.a('string')

			sinon.assert.calledOnce(spy)

			const [userId, opid] = spy.getCall(0).args
			expect(userId).to.be.instanceOf(ObjectId)
			expect(opid).to.be.instanceOf(ObjectId)

			expect(opid).to.deep.equal(requestOpid)
		})

		it('Should return Not Authorized if invalid or missing sessionId', async () => {
			const { body } = await request(app)
				.delete('/v1/market/orderbook/random-opid')
				.send()
				.expect(401)
			expect(body).to.be.an('object').that.deep.equal(notAuthorizedModel)
			sinon.assert.notCalled(spy)
		})

		it('Should return \'Bad Request\' if the informed opid is not 24 characters long', async () => {
			const { body } = await request(app)
				.delete('/v1/market/orderbook/veryShortOpid')
				.set('Cookie', [`sessionId=${sessionId}`])
				.send()
				.expect(400)
			expect(body).to.be.an('object').that.deep.equal({
				error: 'Bad Request',
				message: 'The opid \'veryShortOpid\' is not a valid operation id'
			})
			sinon.assert.notCalled(spy)
		})
	})

	describe('When fetching the market depth', () => {
		let spy: MockGetDepth
		const obj = {
			price: 20,
			volume: 2.58,
			type: 'buy',
			currencies: ['bitcoin', 'nano']
		}

		beforeEach(() => {
			spy = ImportMock.mockFunction(MarketApi, 'getMarketDepth', [obj]) as MockGetDepth
		})

		afterEach(() => {
			spy.restore()
		})

		it('Should return the return of MarketApi', async () => {
			const { body } = await request(app)
				.get('/v1/market/orderbook/depth')
				.query({
					base: 'bitcoin',
					target: 'nano'
				})
				.send()
				.expect('Content-Type', /json/)
				.expect(200)
			expect(body).to.be.an('array').that.deep.equal([obj])
			sinon.assert.calledOnce(spy)
		})

		it('Should return Market Not Found error', async () => {
			const { body } = await request(app)
				.get('/v1/market/orderbook/depth')
				.query({
					base: 'dilmas',
				})
				.send()
				.expect('Content-Type', /json/)
				.expect(400)
			expect(body.error).to.be.an('string').that.equal('BadRequest')
			sinon.assert.notCalled(spy)
		})
	})

	describe('When fetching the market Price', () => {
		let spy: MockGetPrice
		const obj = {
			price: 20,
			type: 'buy',
			currencies: ['bitcoin', 'nano']
		}

		beforeEach(() => {
			spy = ImportMock.mockFunction(MarketApi, 'getMarketPrice', [obj]) as MockGetDepth
		})

		afterEach(() => {
			spy.restore()
		})

		it('Should return the return of MarketApi', async () => {
			const { body } = await request(app)
				.get('/v1/market/price')
				.query({
					base: 'bitcoin',
					target: 'nano'
				})
				.send()
				.expect('Content-Type', /json/)
				.expect(200)
			expect(body).to.be.an('array').that.deep.equal([obj])
			sinon.assert.calledOnce(spy)
		})

		it('Should return Market Not Found error', async () => {
			const { body } = await request(app)
				.get('/v1/market/orderbook/depth')
				.query({
					base: 'dilmas',
				})
				.send()
				.expect('Content-Type', /json/)
				.expect(400)
			expect(body.error).to.be.an('string').that.equal('BadRequest')
			sinon.assert.notCalled(spy)
		})
	})
})
