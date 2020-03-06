import '../../src/libs'
import io from 'socket.io-client'
import { expect } from 'chai'
import { callbackify } from 'util'
import { Decimal128, ObjectId } from 'mongodb'
import Person from '../../src/db/models/person'
import Checklist from '../../src/db/models/checklist'
import Transaction, { TxSend, UpdtSent } from '../../src/db/models/transaction'
import * as CurrencyApi from '../../src/currencyApi'
import * as UserApi from '../../src/userApi'
import type User from '../../src/userApi/user'
import type { TxReceived, UpdtReceived } from '../../src/db/models/transaction'

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

			describe('When receiving update_received_tx', () => {
				let opid: string

				beforeEach(done => {
					Transaction.deleteMany({}).then(() => {
						return Person.findByIdAndUpdate(user.id, {
							$set: {
								[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(0),
								[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
							}
						})
					}).then(() => {
						const transaction: TxReceived = {
							txid: 'randomTxidToUpdate',
							status: 'pending',
							amount: 10,
							account: `${currency}-account`,
							timestamp: 123456789
						}
						client.emit('new_transaction', transaction, (err: any, _opid?: string) => {
							expect(err).to.be.null
							expect(_opid).to.be.a('string')
							opid = _opid
							setTimeout(done, 50)
						})
					})
				})

				it('Sould update a pending transaction', done => {
					const updReceived: UpdtReceived = {
						opid,
						status: 'pending',
						confirmations: 6
					}

					client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals(updReceived.status)
							expect(doc.confirmations).to.equals(updReceived.confirmations)
							done()
						})
					})
				})

				it('Should update a confirmed transaction', done => {
					const updReceived: UpdtReceived = {
						opid,
						status: 'confirmed',
						confirmations: 6
					}

					client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals(updReceived.status)
							expect(doc.confirmations).to.be.undefined
							done()
						})
					})
				})

				it('Sould return UserNotFound if a user for existing transaction was not found', done => {
					// Responde o evento para evitar timeout
					client.once('create_new_account', (callback: (err: any, account: string) => void) => {
						callback(null, `account-${currency}-newUser`)
					})

					callbackify(UserApi.createUser)('randomEmail@email.com', 'UserP@ass', (err, newUser) => {
						expect(err).to.be.null
						expect(newUser).to.be.an('object')
						Person.findByIdAndUpdate(newUser.id, {
							$push: {
								[`currencies.${currency}.accounts`]: `${currency}-account-newUser`
							}
						}, () => {
							client.emit('new_transaction', {
								txid: 'randomTxidOfNewUser',
								status: 'pending',
								amount: 10,
								account: `${currency}-account-newUser`,
								timestamp: 123456789
							}, (err: any, opid?: string) => {
								expect(err).to.be.null
								expect(opid).to.be.a('string')
								Person.findByIdAndDelete(newUser.id, () => {
									client.emit('update_received_tx', {
										opid,
										status: 'confirmed',
										confirmations: 6
									}, (err: any, res?: string) => {
										expect(res).to.be.undefined
										expect(err).to.be.an('object')
										expect(err.code).to.equals('UserNotFound')
										expect(err.message).to.be.a('string')
										done()
									})
								})
							})
						})
					})
				})

				it('Sould not update balance if status is pending', done => {
					const updReceived: UpdtReceived = {
						opid,
						status: 'pending',
						confirmations: 6
					}

					client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Person.findById(user.id, (err, doc) => {
							expect(doc.currencies[currency].balance.locked.toFullString())
								.to.equals('10.0')
							expect(doc.currencies[currency].balance.available.toFullString())
								.to.equals('0.0')
							done()
						})
					})
				})

				it('Should update balance if status is confirmed', done => {
					const updReceived: UpdtReceived = {
						opid,
						status: 'confirmed',
						confirmations: 6
					}

					client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Person.findById(user.id, (err, doc) => {
							expect(doc.currencies[currency].balance.locked.toFullString())
								.to.equals('0.0')
							expect(doc.currencies[currency].balance.available.toFullString())
								.to.equals('10.0')
							done()
						})
					})
				})

				it('Should not fail if confirmations was not informed', done => {
					const updReceived: UpdtReceived = {
						opid,
						status: 'confirmed'
					}

					client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals(updReceived.status)
							expect(doc.confirmations).to.be.undefined
							done()
						})
					})
				})

				it('Should fail if opid was not informed', done => {
					client.emit('update_received_tx', {
						status: 'confirmed',
						confirmations: 6
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('BadRequest')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('pending')
							done()
						})
					})
				})

				it('Should fail if a valid opid was not found', done => {
					client.emit('update_received_tx', {
						opid: '505618b81ce5e89fb0d1b05c',
						status: 'confirmed',
						confirmations: 6
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('OperationNotFound')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('pending')
							done()
						})
					})
				})

				it('Should fail if invalid opid was informed', done => {
					client.emit('update_received_tx', {
						opid: 'invalid-opid-string',
						status: 'confirmed',
						confirmations: 6
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('CastError')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('pending')
							done()
						})
					})
				})

				it('Should fail if status is invalid', done => {
					client.emit('update_received_tx', {
						opid,
						status: 'invalid-status',
						confirmations: 6
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('ValidationError')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('pending')
							done()
						})
					})
				})
			})

			describe('When receiving update_sent_tx', () => {
				let opid: string

				beforeEach(done => {
					Transaction.deleteMany({}).then(() => {
						return Person.findByIdAndUpdate(user.id, {
							$set: {
								[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(50),
								[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
							}
						})
					}).then(() => {
						client.once('withdraw', (transaction: TxSend, callback: (err: null, res?: string) => void) => {
							opid = transaction.opid
							callback(null, 'received withdraw request for' + opid)
							setTimeout(done, 50)
						})

						CurrencyApi.withdraw(user, currency, `${currency}_account`, 10)
							.catch(err => done(err))
					})
				})

				it('Should have status \'processing\' before receiving the first update', async () => {
					const tx = await Transaction.findById(opid)
					expect(tx.status).to.equals('processing')
				})

				it('Sould update a pending transaction', done => {
					const updSent: UpdtSent = {
						opid,
						txid: 'randomTxId',
						status: 'pending',
						confirmations: 6,
						timestamp: 123456789
					}

					client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.txid).to.equals(updSent.txid)
							expect(doc.status).to.equals(updSent.status)
							expect(doc.confirmations).to.equals(updSent.confirmations)
							expect(doc.timestamp.toString()).to.equals(new Date(updSent.timestamp).toString())
							done()
						})
					})
				})

				it('Should update a confirmed transaction', done => {
					const updSent: UpdtSent = {
						opid,
						txid: 'randomTxId',
						status: 'confirmed',
						confirmations: 6,
						timestamp: 123456789
					}

					client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.txid).to.equals(updSent.txid)
							expect(doc.status).to.equals(updSent.status)
							expect(doc.confirmations).to.be.undefined
							expect(doc.timestamp.toString()).to.equals(new Date(updSent.timestamp).toString())
							done()
						})
					})
				})

				it('Sould return UserNotFound if a user for existing transaction was not found', done => {
					let _user: User
					let _opid: ObjectId

					// Responde os eventos para evitar timeout
					client.once('create_new_account', (callback: (err: any, account: string) => void) => {
						callback(null, `account-${currency}-newUser`)
					})

					client.once('withdraw', (request: TxSend, callback: (err: any, response?: string) => void) => {
						callback(null, 'received withdraw request for userNotFound test')

						Person.findByIdAndDelete(_user.id, () => {
							client.emit('update_sent_tx', {
								opid: _opid,
								txid: 'randomTxId',
								status: 'confirmed',
								confirmations: 6,
								timestamp: 123456789
							}, (err: any, res?: string) => {
								expect(res).to.be.undefined
								expect(err).to.be.an('object')
								expect(err.code).to.equals('UserNotFound')
								expect(err.message).to.be.a('string')
								done()
							})
						})
					})

					setImmediate(async () => {
						_user = await UserApi.createUser('randomEmail@email.com', 'UserP@ass')
						await Person.findByIdAndUpdate(_user.id, {
							$set: {
								[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(50),
								[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
							}
						})
						_opid = await CurrencyApi.withdraw(_user, currency, 'randomAccount', 10)
					})
				})

				it('Sould not update balance if status is pending', done => {
					const updSent: UpdtSent = {
						opid,
						txid: 'randomTxId',
						status: 'pending',
						confirmations: 6,
						timestamp: 123456789
					}

					client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Person.findById(user.id, (err, doc) => {
							console.log('balances',
								doc.currencies[currency].balance.locked.toFullString(),
								doc.currencies[currency].balance.available.toFullString(),
							)
							expect(doc.currencies[currency].balance.locked.toFullString())
								.to.equals('10.0')
							expect(doc.currencies[currency].balance.available.toFullString())
								.to.equals('40.0')
							done()
						})
					})
				})

				it('Should update balance if status is confirmed', done => {
					const updSent: UpdtSent = {
						opid,
						txid: 'randomTxId',
						status: 'confirmed',
						confirmations: 6,
						timestamp: 123456789
					}

					client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Person.findById(user.id, (err, doc) => {
							expect(doc.currencies[currency].balance.locked.toFullString())
								.to.equals('0.0')
							expect(doc.currencies[currency].balance.available.toFullString())
								.to.equals('40.0')
							done()
						})
					})
				})

				it('Should not fail if confirmations was not informed', done => {
					const updSent: UpdtSent = {
						opid,
						txid: 'randomTxId',
						status: 'pending',
						timestamp: 123456789
					}

					client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals(updSent.status)
							expect(doc.confirmations).to.be.undefined
							done()
						})
					})
				})

				it('Should fail if opid was not informed', done => {
					client.emit('update_sent_tx', {
						txid: 'randomTxId',
						status: 'confirmed',
						confirmations: 6,
						timestamp: 123456789
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('BadRequest')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('processing')
							done()
						})
					})
				})

				it('Should fail if a valid opid was not found', done => {
					client.emit('update_sent_tx', {
						opid: '505618b81ce5e89fb0d1b05c',
						txid: 'randomTxId',
						status: 'confirmed',
						confirmations: 6,
						timestamp: 123456789
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('OperationNotFound')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('processing')
							done()
						})
					})
				})

				it('Should fail if invalid opid was informed', done => {
					client.emit('update_sent_tx', {
						opid: 'invalid-opid-string',
						txid: 'randomTxId',
						status: 'confirmed',
						confirmations: 6,
						timestamp: 123456789
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('CastError')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('processing')
							done()
						})
					})
				})

				it('Should fail if status is invalid', done => {
					client.emit('update_sent_tx', {
						opid,
						status: 'invalid-status',
						txid: 'randomTxId',
						confirmations: 6,
						timestamp: 123456789
					}, (err: any, res?: string) => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('ValidationError')
						expect(err.message).to.be.a('string')
						Transaction.findById(opid, (err, doc) => {
							expect(doc.status).to.equals('processing')
							done()
						})
					})
				})
			})
		})
	}
})
