import '../../../src/libs/extensions'
import { expect } from 'chai'
import { Socket, setupPerson } from './setup'
import Transaction from '../../../src/db/models/transaction'
import PersonDoc, { Person } from '../../../src/db/models/person'
import * as UserApi from '../../../src/userApi'
import type { UpdtReceived } from '../../../interfaces/transaction'

describe('Testing the receival of update_received_tx on the CurrencyApi', () => {
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

	beforeEach(async () => {
		await Transaction.deleteMany({})

		// @ts-expect-error Automaticamente convertido para Decimal128
		person.currencies.bitcoin.balance.available = 0
		// @ts-expect-error Automaticamente convertido para Decimal128
		person.currencies.bitcoin.balance.locked = 0
		await person.save()

		opid = await client.emit('new_transaction', {
			txid: 'random-txid',
			status: 'pending',
			amount: txAmount,
			account: 'bitcoin-account',
			timestamp: 123456789
		})
	})

	it('Sould update a pending transaction', async () => {
		const updReceived: UpdtReceived = {
			opid,
			status: 'pending',
			confirmations: 6
		}

		await expect(client.emit('update_received_tx', updReceived))
			.to.eventually.be.fulfilled.with.a('string')

		const doc = await Transaction.findById(opid)
		expect(doc.status).to.equals(updReceived.status)
		expect(doc.confirmations).to.equals(updReceived.confirmations)
	})

	it('Should update a confirmed transaction', async () => {
		const updReceived: UpdtReceived = {
			opid,
			status: 'confirmed',
			confirmations: 6
		}

		await expect(client.emit('update_received_tx', updReceived))
			.to.eventually.be.fulfilled.with.a('string')

		const doc = await Transaction.findById(opid)
		expect(doc.status).to.equals(updReceived.status)
		expect(doc.confirmations).to.be.undefined
	})

	it('Sould not update balance if status is pending', async () => {
		const updReceived: UpdtReceived = {
			opid,
			status: 'pending',
			confirmations: 6
		}

		await expect(client.emit('update_received_tx', updReceived))
			.to.eventually.be.fulfilled.with.a('string')

		const doc = await PersonDoc.findById(person.id)
		expect(doc.currencies.bitcoin.balance.locked.toFullString())
			.to.equals(txAmount.toFixed(1))
		expect(doc.currencies.bitcoin.balance.available.toFullString())
			.to.equals('0.0')
	})

	it('Should update balance if status is confirmed', async () => {
		const updReceived: UpdtReceived = {
			opid,
			status: 'confirmed',
			confirmations: 6
		}

		await expect(client.emit('update_received_tx', updReceived))
			.to.eventually.be.fulfilled.with.a('string')

		const doc = await PersonDoc.findById(person.id)
		expect(doc.currencies.bitcoin.balance.locked.toFullString())
			.to.equals('0.0')
		expect(doc.currencies.bitcoin.balance.available.toFullString())
			.to.equals(txAmount.toFixed(1))
	})

	it('Should not fail if confirmations was not informed', async () => {
		const updReceived: UpdtReceived = {
			opid,
			status: 'confirmed'
		}

		await expect(client.emit('update_received_tx', updReceived))
			.to.eventually.be.fulfilled.with.a('string')

		const doc = await Transaction.findById(opid)
		expect(doc.status).to.equals(updReceived.status)
		expect(doc.confirmations).to.be.undefined
	})

	describe('If sending invalid data', () => {
		it('Should return UserNotFound if a user for existing transaction was not found', async () => {
			// Configura o novo usuário
			const newUser = await UserApi.createUser('receive-UserNotFound@email.com', 'UserP@ass')
			await PersonDoc.findByIdAndUpdate(newUser.id, {
				$push: {
					['currencies.bitcoin.accounts']: 'bitcoin-account-newUser'
				}
			})

			const opid = await client.emit('new_transaction', {
				txid: 'UserNotFound-txid',
				status: 'pending',
				amount: 10,
				account: 'bitcoin-account-newUser',
				timestamp: 123456789
			})

			// Deleta o novo usuário
			await PersonDoc.findByIdAndDelete(newUser.id)

			// Envia um update para a transação do usuário deletado
			const updateEvent = client.emit('update_received_tx', {
				opid,
				status: 'confirmed',
				confirmations: 6
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')
			const err = await updateEvent.catch(err => err)
			expect(err).to.be.an('object')
			expect(err.code).to.equals('UserNotFound')
			expect(err.message).to.be.a('string')
		})

		it('Should fail if opid was not informed', async () => {
			const updateEvent = client.emit('update_received_tx', {
				status: 'confirmed',
				confirmations: 6
			} as UpdtReceived)

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('BadRequest')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('pending')
		})

		it('Should fail if a valid opid was not found', async () => {
			const updateEvent = client.emit('update_received_tx', {
				opid: '505618b81ce5e89fb0d1b05c',
				status: 'confirmed',
				confirmations: 6
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('OperationNotFound')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('pending')
		})

		it('Should fail if invalid opid was informed', async () => {
			const updateEvent = client.emit('update_received_tx', {
				opid: 'invalid-opid-string',
				status: 'confirmed',
				confirmations: 6
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('CastError')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('pending')
		})

		it('Should fail if status is invalid', async () => {
			const updateEvent = client.emit('update_received_tx', {
				opid,
				// @ts-expect-error Testando justamente um objeto inválido
				status: 'invalid-status',
				confirmations: 6
			})

			await expect(updateEvent).to.eventually.be.rejected.with.an('object')

			const err = await updateEvent.catch(err => err)
			expect(err).to.be.a('object')
			expect(err.code).to.be.a('string')
				.that.equals('ValidationError')
			expect(err.message).to.be.a('string')

			const doc = await Transaction.findById(opid)
			expect(doc.status).to.equals('pending')
		})
	})
})
