import '../../../src/libs/extensions'
import { expect } from 'chai'
import { Socket, setupPerson } from './setup'
import Transaction from '../../../src/db/models/transaction'
import PersonDoc, { Person } from '../../../src/db/models/person'
import * as CurrencyApi from '../../../src/currencyApi'
import * as UserApi from '../../../src/userApi'
import type { TxSend, UpdtSent } from '../../../interfaces/transaction'

describe('Testing the receival of update_sent_tx on the CurrencyApi', () => {
	let client: Socket
	let person: Person

	before(async () => {
		person = await setupPerson()
		client = new Socket('bitcoin')

		// Responde eventos de create_account para evitar timeout
		client.on('create_new_account', (callback: (err: any, account: string) => void) => {
			callback(null, 'account-bitcoin')
		})
	})

	after(() => {
		client.disconnect()
	})

	const txAmount = 10
	let opid: string

	beforeEach(done => {
		Transaction.deleteMany({}).then(() => {
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies.bitcoin.balance.available = 50
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies.bitcoin.balance.locked = 0

			return person.save()
		}).then(() => {
			return UserApi.findUser.byId(person._id)
		}).then(user => {
			client.once('withdraw', (transaction: TxSend, callback: (err: any, res?: string) => void) => {
				opid = transaction.opid
				callback(null, 'received withdraw request for' + opid)

				// Espera para garantir que a tx terminou de ser processada
				setTimeout(done, 50)
				// done()
				// Atualiza o status para evitar race condition
				// Transaction.updateOne({ _id: opid }, { status: 'external' })
				// 	.then(() => done())
				// 	.catch(done)
			})
			return CurrencyApi.withdraw(user, 'bitcoin', 'bitcoin_account', txAmount)
		}).catch(done)
	})

	it('Should have status \'external\' before receiving the first update', async () => {
		const tx = await Transaction.findById(opid)
		expect(tx.status).to.equals('external')
	})

	it('Sould update a pending transaction', async () => {
		const updSent: UpdtSent = {
			opid,
			txid: 'random-txid',
			status: 'pending',
			confirmations: 6,
			timestamp: 123456789
		}

		await expect(client.emit('update_sent_tx', updSent)).to.eventually.be
			.fulfilled.with.a('string')

		const doc = await Transaction.findById(opid)
		expect(doc.txid).to.equals(updSent.txid)
		expect(doc.status).to.equals(updSent.status)
		expect(doc.confirmations).to.equals(updSent.confirmations)
		expect(doc.timestamp.toString()).to.equals(new Date(updSent.timestamp).toString())
	})

	it('Should update a confirmed transaction', async () => {
		const updSent: UpdtSent = {
			opid,
			txid: 'random-txid',
			status: 'confirmed',
			confirmations: 6,
			timestamp: 123456789
		}

		await expect(client.emit('update_sent_tx', updSent)).to.eventually.be
			.fulfilled.with.a('string')

		const doc = await Transaction.findById(opid)
		expect(doc.txid).to.equals(updSent.txid)
		expect(doc.status).to.equals(updSent.status)
		expect(doc.confirmations).to.be.undefined
		expect(doc.timestamp.toString()).to.equals(new Date(updSent.timestamp).toString())
	})

	it('Sould not update balance if status is pending', async () => {
		const updSent: UpdtSent = {
			opid,
			txid: 'random-txid',
			status: 'pending',
			confirmations: 6,
			timestamp: 123456789
		}

		await expect(client.emit('update_sent_tx', updSent)).to.eventually.be
			.fulfilled.with.a('string')

		const doc = await PersonDoc.findById(person.id)
		expect(doc.currencies.bitcoin.balance.locked.toFullString())
			.to.equals('10.0')
		expect(doc.currencies.bitcoin.balance.available.toFullString())
			.to.equals('40.0')
	})

	it('Should update balance if status is confirmed', async () => {
		const updSent: UpdtSent = {
			opid,
			txid: 'random-txid',
			status: 'confirmed',
			confirmations: 6,
			timestamp: 123456789
		}

		await expect(client.emit('update_sent_tx', updSent)).to.eventually.be
			.fulfilled.with.a('string')

		const doc = await PersonDoc.findById(person.id)
		expect(doc.currencies.bitcoin.balance.locked.toFullString())
			.to.equals('0.0')
		expect(doc.currencies.bitcoin.balance.available.toFullString())
			.to.equals('40.0')
	})

	it('Should not fail if confirmations was not informed', async () => {
		const updSent: UpdtSent = {
			opid,
			txid: 'random-txid',
			status: 'pending',
			timestamp: 123456789
		}

		await expect(client.emit('update_sent_tx', updSent)).to.eventually.be
			.fulfilled.with.a('string')

		const doc = await Transaction.findById(opid)
		expect(doc.status).to.equals(updSent.status)
		expect(doc.confirmations).to.be.undefined
	})

	describe('If sending invalid data', () => {
		it('Should return UserNotFound if a user for existing transaction was not found', done => {
			let userId: Person['_id']

			// Recebe o request de saque
			client.once('withdraw', async (request: TxSend, callback: (err: any, response?: string) => void) => {
				callback(null, 'received withdraw request for userNotFound test')

				try {
					await PersonDoc.findByIdAndDelete(userId)

					// Emite o update para o usuário deletado
					const updateEvent = client.emit('update_sent_tx', {
						opid: request.opid,
						txid: 'randomTxId-deleted-user-bitcoin',
						status: 'confirmed',
						confirmations: 6,
						timestamp: 123456789
					})

					await expect(updateEvent).to.eventually.be.rejected.with.a('object')

					const err = await updateEvent.catch(err => err)
					expect(err).to.be.an('object')
					expect(err.code).to.equals('UserNotFound')
					expect(err.message).to.be.a('string')
					done()
				} catch (err) {
					done(err)
				}
			})

			// Cria o usuário
			UserApi.createUser('non-existing-user-send-bitcoin@email.com', 'UserP@ass').then(user => {
				userId = user.person._id
				// Seta o saldo do usuário
				return PersonDoc.findByIdAndUpdate(user.id, {
					$set: {
						['currencies.bitcoin.balance.available']: 50,
						['currencies.bitcoin.balance.locked']: 0
					}
				})
			}).then(() => {
				return UserApi.findUser.byId(userId)
			}).then(user => {
				// Executa o saque
				return CurrencyApi.withdraw(user, 'bitcoin', 'randomAccount', 10)
			}).catch(done)
		})

		it('Should fail if opid was not informed', async () => {
			const updateEvent = client.emit('update_sent_tx', {
				txid: 'random-txid',
				status: 'confirmed',
				confirmations: 6,
				timestamp: 123456789
			} as UpdtSent)

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('BadRequest')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('external')
		})

		it('Should fail if a valid opid was not found', async () => {
			const updateEvent = client.emit('update_sent_tx', {
				opid: '505618b81ce5e89fb0d1b05c',
				txid: 'random-txid',
				status: 'confirmed',
				confirmations: 6,
				timestamp: 123456789
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('OperationNotFound')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('external')
		})

		it('Should fail if invalid opid was informed', async () => {
			const updateEvent = client.emit('update_sent_tx', {
				opid: 'invalid-opid-string',
				txid: 'random-txid',
				status: 'confirmed',
				confirmations: 6,
				timestamp: 123456789
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('CastError')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('external')
		})

		it('Should fail if status is invalid', async () => {
			const updateEvent = client.emit('update_sent_tx', {
				opid,
				txid: 'random-txid',
				// @ts-expect-error Testando justamente um status inválido
				status: 'invalid-status',
				confirmations: 6,
				timestamp: 123456789
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('ValidationError')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('external')
		})
	})
})
