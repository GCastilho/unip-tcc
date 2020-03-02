import '../../src/libs'
import io from 'socket.io-client'
import { expect } from 'chai'
import { Decimal128 } from 'mongodb'
import Person from '../../src/db/models/person'
import Checklist from '../../src/db/models/checklist'
import Transaction from '../../src/db/models/transaction'
import * as CurrencyApi from '../../src/currencyApi'
import * as UserApi from '../../src/userApi'
import type User from '../../src/userApi/user'
import type { TxReceived } from '../../src/db/models/transaction'

/**
 * Testar os eventos new_transaction, update_received_tx, update_sent_tx
 * Testar se eles estão atualizando corretamente o db
 * Testar se eles estão sendo corretamente emitidos pelo EE público
 * Testar correção de erros (forçar erros ocorrerem)
 */

describe('Testing the receival of events on the CurrencyApi', () => {
	let user: User

	before(async () => {
		await Person.deleteMany({})

		user = await UserApi.createUser('receival_test@example.com', 'userP@ss')
		await Checklist.deleteMany({})

		// Seta dummy accounts para serem usadas nos testes
		for (const currency of CurrencyApi.currencies) {
			await Person.findByIdAndUpdate(user.id, {
				$push: {
					[`currencies.${currency}.accounts`]: `${currency}-account`
				}
			})
		}
	})

	afterEach(done => {
		// Garante que a CurrencyApi terminou de processar o request
		setTimeout(done, 50)
	})

	for (const currency of CurrencyApi.currencies) {
		describe(currency, () => {
			let client: SocketIOClient.Socket

			before(() => {
				client = io(`http://127.0.0.1:${process.env.CURRENCY_API_PORT}/${currency}`)
			})

			after(() => {
				client.disconnect()
			})

			describe('When receiving new_transaction', () => {
				beforeEach(async () => {
					await Transaction.deleteMany({})
					await Person.findByIdAndUpdate(user.id, {
						$set: {
							[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(0),
							[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
						}
					})
				})

				it('Should fail if user was not found', done => {
					const transaction: TxReceived = {
						txid: 'randomTxid',
						status: 'pending',
						amount: 10,
						account: 'not-existing-account',
						timestamp: 123456789
					}

					client.emit('new_transaction', transaction, (err: any, response?: any) => {
						expect(err).to.haveOwnProperty('code').equals('UserNotFound')
						expect(response).to.be.undefined
						Transaction.find({}, (err, transactions) => {
							expect(transactions).to.be.empty
							done()
						})
					})
				})

				it('Should save the transaction on the Transactions collection', done => {
					const transaction: TxReceived = {
						txid: 'randomTxidSave',
						status: 'pending',
						amount: 12.5,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					client.emit('new_transaction', transaction, (err: any, opid?: any) => {
						expect(err).to.be.null
						expect(opid).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.user.toHexString()).to.equals(user.id.toHexString())
							expect(doc.txid).to.equals(transaction.txid)
							expect(doc.status).to.equals(transaction.status)
							expect(doc.amount.toFullString()).to.equals(transaction.amount.toString())
							done()
						})
					})
				})

				it('Should add locked balance for pending transactions', done => {
					const transaction: TxReceived = {
						txid: 'randomTxidLocked',
						status: 'pending',
						amount: 49.7,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					client.emit('new_transaction', transaction, () => {
						Person.findById(user.id, (err, doc) => {
							expect(doc.currencies[currency].balance.available.toFullString())
								.to.equals('0.0')
							expect(doc.currencies[currency].balance.locked.toFullString())
								.to.equals(transaction.amount.toString())
							done()
						})
					})
				})

				it('Should add available balance for confirmed transactions', done => {
					const transaction: TxReceived = {
						txid: 'randomTxidAvailable',
						status: 'confirmed',
						amount: 4.79,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					client.emit('new_transaction', transaction, () => {
						Person.findById(user.id, (err, doc) => {
							expect(doc.currencies[currency].balance.available.toFullString())
								.to.equals(transaction.amount.toString())
							expect(doc.currencies[currency].balance.locked.toFullString())
								.to.equals('0.0')
							done()
						})
					})
				})

				it('Should emit the new_transaction event', done => {
					const transaction: TxReceived = {
						txid: 'randomTxidEvent',
						status: 'pending',
						amount: 24.93,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					CurrencyApi.events.once('new_transaction', (id, coin, tx) => {
						expect(id.toHexString()).to.equals(user.id.toHexString())
						expect(coin).to.equals(currency)
						expect(tx).to.be.an('object')
						expect(tx.txid).to.equals(transaction.txid)
						expect(tx.status).to.equals(transaction.status)
						expect(tx.amount.toString()).to.equals(transaction.amount.toString())
						expect(tx.currency).to.equals(currency)
						expect(tx.account).to.equals(transaction.account)
						expect(tx.timestamp).to.be.a('Date')
						done()
					})

					// eslint-disable-next-line @typescript-eslint/no-empty-function
					client.emit('new_transaction', transaction, () => {})
				})

				it('Should return the transaction if it already exists', done => {
					const transaction: TxReceived = {
						txid: 'randomTxidDuplicated',
						status: 'pending',
						amount: 49.379547,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					client.emit('new_transaction', transaction, (err: any, opid?: string) => {
						expect(err).to.be.null
						expect(opid).to.be.a('string')
						client.emit('new_transaction', transaction, (err: any, _opid?: string) => {
							expect(_opid).to.be.undefined
							expect(err).to.be.an('object')
							expect(err.code).to.equals('TransactionExists')
							expect(err.transaction).to.be.an('object')
							expect(err.transaction.opid).to.equals(opid)
							expect(err.transaction.txid).to.equals(transaction.txid)
							expect(err.transaction.status).to.equals(transaction.status)
							expect(err.transaction.amount).to.equals(transaction.amount.toString())
							expect(err.transaction.account).to.equals(transaction.account)
							done()
						})
					})
				})

				it('Sould ignore digits after supported when saving the transaction', done => {
					const transaction: TxReceived = {
						txid: 'randomTxidDuplicated',
						status: 'pending',
						amount: 1.23456789101112131415,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					client.emit('new_transaction', transaction, (err: any, opid?: string) => {
						Transaction.findById(opid, (err, doc) => {
							expect(doc.amount.toFullString()).to.equals(
								Decimal128.fromNumeric(
									transaction.amount,
									CurrencyApi.currenciesDetailed
										.find(c => c.name === currency)
										.decimals
								).toFullString()
							)
							done()
						})
					})
				})

				it('Should clean the database in case of error') // Forçar erros (usar describe?)

				describe('And sending invalid data', () => {
					const transaction: TxReceived = {
						txid: 'randomTxidValidationError',
						status: 'pending',
						amount: 10.9,
						account: `${currency}-account`,
						timestamp: 123456789
					}

					it('Should fail if amount is a negative value', done => {
						const transaction: TxReceived = {
							txid: 'randomTxidEvent',
							status: 'pending',
							amount: -49.37954,
							account: `${currency}-account`,
							timestamp: 123456789
						}

						// Garante que o request não irá falhar por falta de saldo
						Person.findByIdAndUpdate(user.id, {
							$set: {
								[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(50)
							}
						}, err => {
							expect(err).to.be.null
							client.emit('new_transaction', transaction, (err: any, opid?: string) => {
								expect(err).to.be.an('object')
								expect(err.code).to.equals('BadRequest')
								expect(err.message).to.be.a('string')
								expect(opid).to.be.undefined
								Person.findById(user.id, (err, doc) => {
									expect(doc.currencies[currency].balance.available.toFullString())
										.to.equals('50.0')
									expect(doc.currencies[currency].balance.locked.toFullString())
										.to.equals('0.0')
									Transaction.find({}, (err, txs) => {
										expect(txs).to.have.lengthOf(0)
										done()
									})
								})
							})
						})
					})

					it('Should return ValidationError if status is invalid', done => {
						const invalidStatus = {
							...transaction,
							status: 'not-valid-status'
						}
						client.emit('new_transaction', invalidStatus, (err: any, opid?: string) => {
							expect(err.code).to.equals('ValidationError')
							expect(opid).to.be.undefined
							done()
						})
					})

					it('Should return BadRequest if amount is not numeric', done => {
						const invalidAmount = {
							...transaction,
							amount: '68.94p'
						}
						client.emit('new_transaction', invalidAmount, (err: any, opid?: string) => {
							expect(err.code).to.equals('BadRequest')
							expect(err.message).to.be.a('string')
							expect(opid).to.be.undefined
							done()
						})
					})

					it('Should return ValidationError if confirmations is not a number', done => {
						const invalidConfirmations = {
							...transaction,
							confirmations: '6j'
						}
						client.emit('new_transaction', invalidConfirmations, (err: any, opid?: string) => {
							console.log('jere')
							expect(err.code).to.equals('ValidationError')
							expect(opid).to.be.undefined
							done()
						})
					})

					it('Should return ValidationError if timestamp is not valid', done => {
						const invalidTimestamp = {
							...transaction,
							timestamp: '123456789t'
						}
						client.emit('new_transaction', invalidTimestamp, (err: any, opid?: string) => {
							expect(err.code).to.equals('ValidationError')
							expect(opid).to.be.undefined
							done()
						})
					})
				})
			})
		})
	}
})
