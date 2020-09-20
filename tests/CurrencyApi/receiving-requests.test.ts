import '../../src/libs/extensions'
import io from 'socket.io-client'
import { expect } from 'chai'
import { Decimal128 } from 'mongodb'
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
		await Transaction.deleteMany({})

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

	for (const currency of CurrencyApi.currencies) {
		const CURRENCY_API_PORT = process.env.CURRENCY_API_PORT || 5808
		let client: SocketIOClient.Socket
		let account_counter = 0
		let txid: string
		let txidCounter = 0

		before(() => {
			client = io(`http://127.0.0.1:${CURRENCY_API_PORT}/${currency}`)

			// Responde eventos de create_account para evitar timeout
			client.on('create_new_account', (callback: (err: any, account: string) => void) => {
				account_counter++
				callback(null, 'account-' + currency + account_counter)
			})
		})

		beforeEach(() => {
			txidCounter++
			txid = `txid-${currency}-${txidCounter}`
		})

		after(() => {
			client.disconnect()
		})

		describe(`When ${currency} module receives new_transaction`, () => {
			beforeEach(async () => {
				await Person.findByIdAndUpdate(user.id, {
					$set: {
						[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(0),
						[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
					}
				})
			})

			it('Should fail if user was not found', done => {
				const transaction: TxReceived = {
					txid,
					status: 'pending',
					amount: 10,
					account: 'not-existing-account',
					timestamp: 123456789
				}

				Transaction.find({}, (err, txs_before) => {
					client.emit('new_transaction', transaction, (err: any, response?: any) => {
						Promise.resolve().then(() => {
							expect(err).to.haveOwnProperty('code').that.equals('UserNotFound')
							expect(response).to.be.undefined
							return Transaction.find({})
						}).then(transactions => {
							expect(transactions.length).to.equals(txs_before.length)
							done()
						})
					})
				})
			})

			it('Should save the transaction on the Transactions collection', done => {
				const transaction: TxReceived = {
					txid,
					status: 'pending',
					amount: 12.5,
					account: `${currency}-account`,
					timestamp: 123456789
				}

				client.emit('new_transaction', transaction, (err: any, opid?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(opid).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.userId.toHexString()).to.equals(user.id.toHexString())
						expect(doc.txid).to.equals(transaction.txid)
						expect(doc.status).to.equals(transaction.status)
						expect(doc.amount.toFullString()).to.equals(transaction.amount.toString())
						done()
					}).catch(done)
				})
			})

			it('Should add locked balance for pending transactions', done => {
				const transaction: TxReceived = {
					txid,
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
					txid,
					status: 'confirmed',
					amount: 4.79,
					account: `${currency}-account`,
					timestamp: 123456789
				}

				client.emit('new_transaction', transaction, () => {
					Person.findById(user.id, (err, doc) => {
						expect(doc).to.be.an('object')
						expect(doc.currencies[currency].balance.available.toFullString())
							.to.equals(transaction.amount.toString())
						expect(doc.currencies[currency].balance.locked.toFullString())
							.to.equals('0.00')
						done()
					})
				})
			})

			it('Should emit the new_transaction event', done => {
				const transaction: TxReceived = {
					txid,
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
					expect(tx.amount).to.equals(transaction.amount)
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
					txid,
					status: 'pending',
					amount: 49.379547,
					account: `${currency}-account`,
					timestamp: 123456789
				}

				client.emit('new_transaction', transaction, (err: any, opid?: string) => {
					expect(err).to.be.null
					expect(opid).to.be.a('string')
					client.emit('new_transaction', transaction, (err: any, _opid?: string) => {
						try {
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
						} catch(err) {
							done(err)
						}
					})
				})
			})

			describe('And sending invalid data', () => {
				const transaction: TxReceived = {
					txid,
					status: 'pending',
					amount: 10.9,
					account: `${currency}-account`,
					timestamp: 123456789
				}

				it('Should fail if amount is a negative value', done => {
					const negativeAmount: TxReceived = {
						...transaction,
						amount: -49.37954
					}
					const available = Decimal128.fromNumeric(50).toFullString()
					const locked = Decimal128.fromNumeric(0).toFullString()
					// Garante que o request não irá falhar por falta de saldo
					Person.findByIdAndUpdate(user.id, {
						$set: {
							[`currencies.${currency}.balance.available`]: Decimal128.fromString(available),
							[`currencies.${currency}.balance.locked`]: Decimal128.fromString(locked)
						}
					}).then(() => {
						return Transaction.find({})
					}).then(txs_before => {
						client.emit('new_transaction', negativeAmount, (err: any, opid?: string) => {
							Promise.resolve().then(() => {
								expect(err).to.be.an('object')
								expect(err.code).to.equals('ValidationError')
								expect(err.message).to.be.a('string')
								expect(opid).to.be.undefined
								return Person.findById(user.id)
							}).then(doc => {
								// Checa se o doc do usuário não foi alterado
								expect(doc.currencies[currency].balance.available.toFullString())
									.to.equals(available)
								expect(doc.currencies[currency].balance.locked.toFullString())
									.to.equals(locked)
								return Transaction.find({})
							}).then(txs => {
								expect(txs).to.have.lengthOf(txs_before.length)
								done()
							}).catch(done)
						})
					}).catch(done)
				})

				it('Should return ValidationError if status is invalid', done => {
					const invalidStatus = {
						...transaction,
						status: 'not-valid-status'
					}
					client.emit('new_transaction', invalidStatus, (err: any, opid?: string) => {
						try {
							expect(err.code).to.equals('ValidationError')
							expect(opid).to.be.undefined
							done()
						} catch(err) {
							done(err)
						}
					})
				})

				it('Should return ValidationError if amount is not numeric', done => {
					const invalidAmount = {
						...transaction,
						amount: '68.94p'
					}
					client.emit('new_transaction', invalidAmount, (err: any, opid?: string) => {
						try {
							expect(err.code).to.equals('ValidationError')
							expect(err.message).to.be.a('string')
							expect(opid).to.be.undefined
							done()
						} catch(err) {
							done(err)
						}
					})
				})

				it('Should return ValidationError if confirmations is not a number', done => {
					const invalidConfirmations = {
						...transaction,
						confirmations: '6j'
					}
					client.emit('new_transaction', invalidConfirmations, (err: any, opid?: string) => {
						try {
							expect(err.code).to.equals('ValidationError')
							expect(opid).to.be.undefined
							done()
						} catch(err) {
							done(err)
						}
					})
				})

				it('Should return ValidationError if timestamp is not valid', done => {
					const invalidTimestamp = {
						...transaction,
						timestamp: '123456789t'
					}
					client.emit('new_transaction', invalidTimestamp, (err: any, opid?: string) => {
						try {
							expect(err.code).to.equals('ValidationError')
							expect(opid).to.be.undefined
							done()
						} catch(err) {
							done(err)
						}
					})
				})
			})
		})

		describe(`When ${currency} module receives update_received_tx`, () => {
			const txAmount = Decimal128.fromNumeric(10).toFullString()
			let opid: string

			beforeEach(done => {
				Person.findByIdAndUpdate(user.id, {
					$set: {
						[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(0),
						[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
					}
				}).then(() => {
					const transaction: TxReceived = {
						txid,
						status: 'pending',
						amount: txAmount,
						account: `${currency}-account`,
						timestamp: 123456789
					}
					client.emit('new_transaction', transaction, (err: any, _opid?: string) => {
						try {
							expect(err).to.be.null
							expect(_opid).to.be.a('string')
							opid = _opid
							done()
						} catch(err) {
							done(err)
						}
					})
				}).catch(done)
			})

			it('Sould update a pending transaction', done => {
				const updReceived: UpdtReceived = {
					opid,
					status: 'pending',
					confirmations: 6
				}

				client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals(updReceived.status)
						expect(doc.confirmations).to.equals(updReceived.confirmations)
						done()
					}).catch(done)
				})
			})

			it('Should update a confirmed transaction', done => {
				const updReceived: UpdtReceived = {
					opid,
					status: 'confirmed',
					confirmations: 6
				}

				client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals(updReceived.status)
						expect(doc.confirmations).to.be.undefined
						done()
					}).catch(done)
				})
			})

			it('Should return UserNotFound if a user for existing transaction was not found', done => {
				// Configura o novo usuário
				UserApi.createUser(`UserNotFound-receive-${currency}@email.com`, 'UserP@ass').then(newUser => {
					return Person.findByIdAndUpdate(newUser.id, {
						$push: {
							[`currencies.${currency}.accounts`]: `${currency}-account-newUser`
						}
					})
				}).then(person => {
					// Emite a transação
					client.emit('new_transaction', {
						txid: `UserNotFound-txid-${currency}`,
						status: 'pending',
						amount: 10,
						account: `${currency}-account-newUser`,
						timestamp: 123456789
					}, (err: any, opid?: string) => {
						Promise.resolve().then(() => {
							expect(err).to.be.null
							expect(opid).to.be.a('string')
							// Deleta o novo usuário
							return Person.findByIdAndDelete(person.id)
						}).then(() => {
							// Envia um update para a transação do usuário deletado
							client.emit('update_received_tx', {
								opid,
								status: 'confirmed',
								confirmations: 6
							}, (err: any, res?: string) => {
								try {
									expect(res).to.be.undefined
									expect(err).to.be.an('object')
									expect(err.code).to.equals('UserNotFound')
									expect(err.message).to.be.a('string')
									done()
								} catch(err) {
									done(err)
								}
							})
						}).catch(done)
					})
				}).catch(done)
			})

			it('Sould not update balance if status is pending', done => {
				const updReceived: UpdtReceived = {
					opid,
					status: 'pending',
					confirmations: 6
				}

				client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Person.findById(user.id)
					}).then(doc => {
						expect(doc.currencies[currency].balance.locked.toFullString())
							.to.equals(txAmount)
						expect(doc.currencies[currency].balance.available.toFullString())
							.to.equals('0.0')
						done()
					}).catch(done)
				})
			})

			it('Should update balance if status is confirmed', done => {
				const updReceived: UpdtReceived = {
					opid,
					status: 'confirmed',
					confirmations: 6
				}

				client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Person.findById(user.id)
					}).then(doc => {
						expect(doc.currencies[currency].balance.locked.toFullString())
							.to.equals('0.0')
						expect(doc.currencies[currency].balance.available.toFullString())
							.to.equals(txAmount)
						done()
					}).catch(done)
				})
			})

			it('Should not fail if confirmations was not informed', done => {
				const updReceived: UpdtReceived = {
					opid,
					status: 'confirmed'
				}

				client.emit('update_received_tx', updReceived, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals(updReceived.status)
						expect(doc.confirmations).to.be.undefined
						done()
					}).catch(done)
				})
			})

			it('Should fail if opid was not informed', done => {
				client.emit('update_received_tx', {
					status: 'confirmed',
					confirmations: 6
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('BadRequest')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('pending')
						done()
					}).catch(done)
				})
			})

			it('Should fail if a valid opid was not found', done => {
				client.emit('update_received_tx', {
					opid: '505618b81ce5e89fb0d1b05c',
					status: 'confirmed',
					confirmations: 6
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('OperationNotFound')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('pending')
						done()
					}).catch(done)
				})
			})

			it('Should fail if invalid opid was informed', done => {
				client.emit('update_received_tx', {
					opid: 'invalid-opid-string',
					status: 'confirmed',
					confirmations: 6
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('CastError')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('pending')
						done()
					}).catch(done)
				})
			})

			it('Should fail if status is invalid', done => {
				client.emit('update_received_tx', {
					opid,
					status: 'invalid-status',
					confirmations: 6
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('ValidationError')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('pending')
						done()
					}).catch(done)
				})
			})
		})

		describe(`When ${currency} module receives update_sent_tx`, () => {
			let opid: string

			beforeEach(done => {
				Person.findByIdAndUpdate(user.id, {
					$set: {
						[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(50),
						[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
					}
				}).then(() => {
					client.once('withdraw', (transaction: TxSend, callback: (err: null, res?: string) => void) => {
						opid = transaction.opid
						callback(null, 'received withdraw request for' + opid)
						done()
					})
					CurrencyApi.withdraw(user, currency, `${currency}_account`, 10)
						.catch(done)
				})
			})

			it('Should have status \'processing\' before receiving the first update', async () => {
				const tx = await Transaction.findById(opid)
				expect(tx.status).to.equals('processing')
			})

			it('Sould update a pending transaction', done => {
				const updSent: UpdtSent = {
					opid,
					txid,
					status: 'pending',
					confirmations: 6,
					timestamp: 123456789
				}

				client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.txid).to.equals(updSent.txid)
						expect(doc.status).to.equals(updSent.status)
						expect(doc.confirmations).to.equals(updSent.confirmations)
						expect(doc.timestamp.toString()).to.equals(new Date(updSent.timestamp).toString())
						done()
					}).catch(done)
				})
			})

			it('Should update a confirmed transaction', done => {
				const updSent: UpdtSent = {
					opid,
					txid,
					status: 'confirmed',
					confirmations: 6,
					timestamp: 123456789
				}

				client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.txid).to.equals(updSent.txid)
						expect(doc.status).to.equals(updSent.status)
						expect(doc.confirmations).to.be.undefined
						expect(doc.timestamp.toString()).to.equals(new Date(updSent.timestamp).toString())
						done()
					}).catch(done)
				})
			})

			it('Should return UserNotFound if a user for existing transaction was not found', done => {
				let user: User

				// Cria o usuário
				UserApi.createUser(`non-existing-user-send-${currency}@email.com`, 'UserP@ass').then(_user => {
					user = _user
					// Seta o saldo do usuário
					return Person.findByIdAndUpdate(_user.id, {
						$set: {
							[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(50),
							[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
						}
					})
				}).then(() => {
					// Executa o saque
					return CurrencyApi.withdraw(user, currency, 'randomAccount', 10)
				}).then(opid => {
					// Recebe o request de saque
					client.once('withdraw', (request: TxSend, callback: (err: any, response?: string) => void) => {
						callback(null, 'received withdraw request for userNotFound test')

						// Deleta o usuário
						Person.findByIdAndDelete(user.id).then(() => {
							// Emite o update para o usuário deletado
							client.emit('update_sent_tx', {
								opid,
								txid: `randomTxId-deleted-user-${currency}`,
								status: 'confirmed',
								confirmations: 6,
								timestamp: 123456789
							}, (err: any, res?: string) => {
								try {
									expect(res).to.be.undefined
									expect(err).to.be.an('object')
									expect(err.code).to.equals('UserNotFound')
									expect(err.message).to.be.a('string')
									done()
								} catch(err) {
									done(err)
								}
							})
						}).catch(done)
					})
				}).catch(done)
			})

			it('Sould not update balance if status is pending', done => {
				const updSent: UpdtSent = {
					opid,
					txid,
					status: 'pending',
					confirmations: 6,
					timestamp: 123456789
				}

				client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Person.findById(user.id)
					}).then(doc => {
						expect(doc.currencies[currency].balance.locked.toFullString())
							.to.equals('10.0')
						expect(doc.currencies[currency].balance.available.toFullString())
							.to.equals('40.0')
						done()
					}).catch(done)
				})
			})

			it('Should update balance if status is confirmed', done => {
				const updSent: UpdtSent = {
					opid,
					txid,
					status: 'confirmed',
					confirmations: 6,
					timestamp: 123456789
				}

				client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Person.findById(user.id)
					}).then(doc => {
						expect(doc.currencies[currency].balance.locked.toFullString())
							.to.equals('0.0')
						expect(doc.currencies[currency].balance.available.toFullString())
							.to.equals('40.0')
						done()
					}).catch(done)
				})
			})

			it('Should not fail if confirmations was not informed', done => {
				const updSent: UpdtSent = {
					opid,
					txid,
					status: 'pending',
					timestamp: 123456789
				}

				client.emit('update_sent_tx', updSent, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(err).to.be.null
						expect(res).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals(updSent.status)
						expect(doc.confirmations).to.be.undefined
						done()
					}).catch(done)
				})
			})

			it('Should fail if opid was not informed', done => {
				client.emit('update_sent_tx', {
					txid,
					status: 'confirmed',
					confirmations: 6,
					timestamp: 123456789
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('BadRequest')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('processing')
						done()
					}).catch(done)
				})
			})

			it('Should fail if a valid opid was not found', done => {
				client.emit('update_sent_tx', {
					opid: '505618b81ce5e89fb0d1b05c',
					txid,
					status: 'confirmed',
					confirmations: 6,
					timestamp: 123456789
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('OperationNotFound')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('processing')
						done()
					}).catch(done)
				})
			})

			it('Should fail if invalid opid was informed', done => {
				client.emit('update_sent_tx', {
					opid: 'invalid-opid-string',
					txid,
					status: 'confirmed',
					confirmations: 6,
					timestamp: 123456789
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('CastError')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('processing')
						done()
					}).catch(done)
				})
			})

			it('Should fail if status is invalid', done => {
				client.emit('update_sent_tx', {
					opid,
					txid,
					status: 'invalid-status',
					confirmations: 6,
					timestamp: 123456789
				}, (err: any, res?: string) => {
					Promise.resolve().then(() => {
						expect(res).to.be.undefined
						expect(err).to.be.a('object')
						expect(err.code).to.be.a('string')
							.that.equals('ValidationError')
						expect(err.message).to.be.a('string')
						return Transaction.findById(opid)
					}).then(doc => {
						expect(doc.status).to.equals('processing')
						done()
					}).catch(done)
				})
			})
		})
	}
})
