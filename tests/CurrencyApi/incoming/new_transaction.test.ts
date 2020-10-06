import '../../../src/libs/extensions'
import { expect } from 'chai'
import { Socket, setupPerson } from './setup'
import Transaction from '../../../src/db/models/transaction'
import PersonDoc from '../../../src/db/models/person'
import * as CurrencyApi from '../../../src/currencyApi'
import type { TxReceived } from '../../../interfaces/transaction'

describe('Testing the receival of new_transaction on the CurrencyApi', () => {
	let client: Socket
	let person: InstanceType<typeof PersonDoc>

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

	beforeEach(async () => {
		// @ts-expect-error Automaticamente convertido para Decimal128
		person.currencies.bitcoin.balance.available = 0
		// @ts-expect-error Automaticamente convertido para Decimal128
		person.currencies.bitcoin.balance.locked = 0

		await person.save()
		await Transaction.deleteMany({})
	})

	it('Should fail if user was not found', async () => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'pending',
			amount: 10,
			account: 'not-existing-account',
			timestamp: 123456789
		}

		const txs_before = await Transaction.find({})
		await expect(client.emit('new_transaction', transaction)).to.eventually.be
			.rejected.and.haveOwnProperty('code', 'UserNotFound')
		const txs_after = await Transaction.find({})
		expect(txs_before.length).to.equals(txs_after.length)
	})

	it('Should save the transaction on the Transactions collection', async () => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'pending',
			amount: 12.5,
			account: 'bitcoin-account',
			timestamp: 123456789
		}

		const opid = await client.emit('new_transaction', transaction)
		expect(opid).to.be.a('string')
		const doc = await Transaction.findById(opid)
		expect(doc.userId.toHexString()).to.equals(person.id)
		expect(doc.txid).to.equals(transaction.txid)
		expect(doc.status).to.equals(transaction.status)
		expect(doc.amount.toFullString()).to.equals(transaction.amount.toString())
	})

	it('Should add locked balance for pending transactions', async () => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'pending',
			amount: 49.7,
			account: 'bitcoin-account',
			timestamp: 123456789
		}

		await client.emit('new_transaction', transaction)
		const doc = await PersonDoc.findById(person.id)
		expect(doc.currencies.bitcoin.balance.available.toFullString())
			.to.equals('0.0')
		expect(doc.currencies.bitcoin.balance.locked.toFullString())
			.to.equals(transaction.amount.toString())
	})

	it('Should add available balance for confirmed transactions', async () => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'confirmed',
			amount: 4.79,
			account: 'bitcoin-account',
			timestamp: 123456789
		}

		await client.emit('new_transaction', transaction)
		const doc = await PersonDoc.findById(person.id)
		expect(doc).to.be.an('object')
		expect(doc.currencies.bitcoin.balance.available.toFullString())
			.to.equals(transaction.amount.toString())
		expect(doc.currencies.bitcoin.balance.locked.toFullString())
			.to.equals('0.00')
	})

	it('Should emit the new_transaction event', done => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'pending',
			amount: 24.93,
			account: 'bitcoin-account',
			timestamp: 123456789
		}

		CurrencyApi.events.once('new_transaction', (id, coin, tx) => {
			expect(id.toHexString()).to.equals(person.id)
			expect(coin).to.equals('bitcoin')
			expect(tx).to.be.an('object')
			expect(tx.txid).to.equals(transaction.txid)
			expect(tx.status).to.equals(transaction.status)
			expect(tx.amount).to.equals(transaction.amount)
			expect(tx.currency).to.equals('bitcoin')
			expect(tx.account).to.equals(transaction.account)
			expect(tx.timestamp).to.be.a('Date')
			done()
		})

		client.emit('new_transaction', transaction).catch(done)
	})

	it('Should return the transaction if it already exists', async () => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'pending',
			amount: 49.379547,
			account: 'bitcoin-account',
			timestamp: 123456789
		}

		const opid = await client.emit('new_transaction', transaction)
		expect(opid).to.be.a('string')
		const event = client.emit('new_transaction', transaction)
		await expect(event)
			.to.eventually.be.rejected.with.an('object')

		const err = await event.catch(err => err)
		expect(err).to.be.an('object')
		expect(err.code).to.equals('TransactionExists')
		expect(err.transaction).to.be.an('object')
		expect(err.transaction.opid).to.equals(opid)
		expect(err.transaction.txid).to.equals(transaction.txid)
		expect(err.transaction.status).to.equals(transaction.status)
		expect(err.transaction.amount).to.equals(transaction.amount.toString())
		expect(err.transaction.account).to.equals(transaction.account)
	})

	describe('If sending invalid data', () => {
		const transaction: TxReceived = {
			txid: 'random-txid',
			status: 'pending',
			amount: 10.9,
			account: 'bitcoin-account',
			timestamp: 123456789
		}

		it('Should fail if amount is a negative value', async () => {
			const negativeAmount: TxReceived = {
				...transaction,
				amount: -49.37954
			}
			const available = 50
			const locked = 0

			// Garante que o request não irá falhar por falta de saldo
			await PersonDoc.findByIdAndUpdate(person.id, {
				$set: {
					['currencies.bitcoin.balance.available']: available,
					['currencies.bitcoin.balance.locked']: locked
				}
			})

			const txs_before = await Transaction.find({})
			const event = client.emit('new_transaction', negativeAmount)
			expect(event).to.eventually.be.rejected.with.an('object')

			const err = await event.catch(err => err)
			expect(err).to.be.an('object')
			expect(err.code).to.equals('ValidationError')
			expect(err.message).to.be.a('string')

			const doc = await PersonDoc.findById(person.id)
			// Checa se o doc do usuário não foi alterado
			expect(doc.currencies.bitcoin.balance.available.toFullString())
				.to.equals(available.toFixed(1))
			expect(doc.currencies.bitcoin.balance.locked.toFullString())
				.to.equals(locked.toFixed(1))

			const txs_after = await Transaction.find({})
			expect(txs_after).to.have.lengthOf(txs_before.length)
		})

		it('Should return ValidationError if status is invalid', async () => {
			// @ts-expect-error Testando justamente um objeto inválido
			const invalidStatus = {
				...transaction,
				status: 'not-valid-status'
			} as TxReceived

			await expect(client.emit('new_transaction', invalidStatus))
				.to.eventually.be.rejected.with.an('object')
				.that.have.property('code').that.equals('ValidationError')
		})

		it('Should return ValidationError if amount is not numeric', async () => {
			const invalidAmount = {
				...transaction,
				amount: '68.94p'
			}

			await expect(client.emit('new_transaction', invalidAmount))
				.to.eventually.be.rejected.with.an('object')
				.that.have.property('code').that.equals('ValidationError')
		})

		it('Should return ValidationError if confirmations is not a number', async () => {
			// @ts-expect-error Testando justamente um objeto inválido
			const invalidConfirmations = {
				...transaction,
				confirmations: '6j'
			} as TxReceived

			await expect(client.emit('new_transaction', invalidConfirmations))
				.to.eventually.been.rejected.with.an('object')
				.that.have.property('code').that.equals('ValidationError')
		})

		it('Should return ValidationError if timestamp is not valid', async () => {
			// @ts-expect-error Testando justamente um objeto inválido
			const invalidTimestamp = {
				...transaction,
				timestamp: '123456789t'
			} as TxReceived

			await expect(client.emit('new_transaction', invalidTimestamp))
				.to.eventually.been.rejected.with.an('object')
				.that.have.property('code').that.equals('ValidationError')
		})
	})
})
