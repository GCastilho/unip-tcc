import '../src/libs/extensions'
import { Decimal128, ObjectId } from 'mongodb'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as UserApi from '../src/userApi'
import User from '../src/userApi/user'
import Person from '../src/db/models/person'
import { currencyNames, currenciesObj } from '../src/libs/currencies'

chai.use(chaiAsPromised)

describe('Testing UserApi', () => {
	let user: User

	for (const currency of currencyNames) {
		describe('for ' + currency, () => {
			beforeEach(async () => {
				await Person.deleteMany({})
				const { id } = await UserApi.createUser('userApi-test@email.com', 'userP@ss')

				await Person.findByIdAndUpdate(id, {
					$set: {
						[`currencies.${currency}.balance.available`]: Decimal128.fromNumeric(50),
						[`currencies.${currency}.balance.locked`]: Decimal128.fromNumeric(0)
					},
					$push: {
						[`currencies.${currency}.accounts`]: `${currency}-account`
					}
				})

				user = await UserApi.findUser.byId(id)
			})

			it('Should return the balances for a currency', async () => {
				const { available, locked } = await user.getBalance(currency)
				expect(available.toFullString()).to.equals(Decimal128.fromNumeric(50).toFullString())
				expect(locked.toFullString()).to.equals(Decimal128.fromNumeric(0).toFullString())
			})

			it('Should return the accounts of a currency', async () => {
				const accounts = await user.getAccounts(currency)
				expect(accounts).to.be.an('array')
				expect(accounts).to.have.lengthOf(1)
				expect(accounts[0]).to.equals(`${currency}-account`)
			})

			it('Should update the password', async () => {
				// limpa o array de accounts para não dar problema com os validators
				user.person.currencies[currency].accounts = []

				const oldHash = user.person.credentials.password_hash
				user = await user.changePassword('newPass')
				expect(user.person.credentials.password_hash).to.not.equals(oldHash)
			})

			describe('Testing checkPassword method', () => {
				it('Should not fail if password is correct', async () => {
					await expect(user.checkPassword('userP@ss')).to.eventually.be.fulfilled
				})

				it('Should throw InvalidPassword if password is incorrect', async () => {
					await expect(user.checkPassword('invalidP@ss')).to.eventually.be
						.rejectedWith('InvalidPassword')
				})
			})

			describe('Testing balance operations', () => {
				it('Should add a pending operation', async () => {
					await user.balanceOps.add(currency, {
						opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
						type: 'transaction',
						amount: 20
					})

					const person = await Person.findById(user.id)
					expect(person.currencies[currency].pending).to.have.lengthOf(1)
					expect(person.currencies[currency].pending[0]).to.be.an('object')
					expect(person.currencies[currency].pending[0].opid.toHexString())
						.to.equals('89fb0d1b05c505618b81ce5e')
					expect(person.currencies[currency].pending[0].amount.toFullString())
						.to.equals(Decimal128.fromNumeric(20).toFullString())
					expect(person.currencies[currency].pending[0].type).to.equals('transaction')
				})

				it('Should decrement from the available balance', async () => {
					await user.balanceOps.add(currency, {
						opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
						type: 'transaction',
						amount: -20
					})

					const person = await Person.findById(user.id)
					expect(person.currencies[currency].balance.available.toFullString())
						.to.equals(Decimal128.fromNumeric(30).toFullString())
					expect(person.currencies[currency].balance.locked.toFullString())
						.to.equals(Decimal128.fromNumeric(20).toFullString())
				})

				it('Should fail to add negative operation greater than the available balance', async () => {
					await expect(user.balanceOps.add(currency, {
						opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
						type: 'transaction',
						amount: -60
					})).to.be.rejectedWith('NotEnoughFunds')

					const person = await Person.findById(user.id)
					expect(person.currencies[currency].balance.available.toFullString())
						.to.equals(Decimal128.fromNumeric(50).toFullString())
					expect(person.currencies[currency].balance.locked.toFullString())
						.to.equals(Decimal128.fromNumeric(0).toFullString())
				})

				describe('When there is a pending operation', () => {
					const opid = new ObjectId('89fb0d1b05c505618b81ce5e')

					beforeEach(async () => {
						user.person.currencies[currency].accounts = []
						user.person.currencies[currency].balance.available = Decimal128.fromNumeric(50)
						user.person.currencies[currency].balance.locked = Decimal128.fromNumeric(0)
						await user.person.save()

						await user.balanceOps.add(currency, {
							opid,
							type: 'transaction',
							amount: 20
						})
					})

					it('Should have the amount incremented on the locked balance', async () => {
						const person = await Person.findById(user.id)
						expect(person.currencies[currency].balance.available.toFullString())
							.to.equals(Decimal128.fromNumeric(50).toFullString())
						expect(person.currencies[currency].balance.locked.toFullString())
							.to.equals(Decimal128.fromNumeric(20).toFullString())
					})

					it('Should return a pending operation', async () => {
						const op = await user.balanceOps.get(currency, opid)
						expect(op).to.be.an('object')
						expect(op.type).to.equals('transaction')
						expect(op.amount.toFullString())
							.to.equals(Decimal128.fromNumeric(20).toFullString())
					})

					it('Should cancel a pending operation', async () => {
						await user.balanceOps.cancel(currency, opid)
						const person = await Person.findById(user.id)
						expect(person.currencies[currency].pending).to.have.lengthOf(0)
						expect(person.currencies[currency].balance.available.toFullString())
							.to.equals(Decimal128.fromNumeric(50).toFullString())
						expect(person.currencies[currency].balance.locked.toFullString())
							.to.equals(Decimal128.fromNumeric(0).toFullString())
					})

					it('Should complete a pending operation', async () => {
						await user.balanceOps.complete(currency, opid)
						const person = await Person.findById(user.id)
						expect(person.currencies[currency].pending).to.have.lengthOf(0)
						expect(person.currencies[currency].balance.available.toFullString())
							.to.equals(Decimal128.fromNumeric(70).toFullString())
						expect(person.currencies[currency].balance.locked.toFullString())
							.to.equals(Decimal128.fromNumeric(0).toFullString())
					})

					it('Should update balance with truncated amount', async () => {
						// Completa a operação original
						await user.balanceOps.complete(currency, opid)
						const amount = '1.1234567891011121314151617181920'
						await user.balanceOps.add(currency, {
							opid,
							amount,
							type: 'transaction'
						})
						await user.balanceOps.complete(currency, opid)
						const person = await Person.findById(user.id)
						const truncatedDecimals = amount.split('.')[1]
							.slice(0, currenciesObj[currency].decimals)
						expect(person.currencies[currency].balance.available.toFullString())
							.to.equals('71.' + truncatedDecimals)
					})

					describe('And is requested to partially complete it', () => {
						const rfOpid = new ObjectId()

						it('Should partially complete a pending operation that increases balance', async () => {
							const partialAmount = Decimal128.fromNumeric(10)

							await user.balanceOps.complete(currency, opid, rfOpid, partialAmount)
							const person = await Person.findById(user.id)
							expect(person.currencies[currency].pending).to.have.lengthOf(1)
							expect(person.currencies[currency].balance.available.toFullString())
								.to.equals(Decimal128.fromNumeric(60).toFullString())
							expect(person.currencies[currency].balance.locked.toFullString())
								.to.equals(Decimal128.fromNumeric(10).toFullString())
							expect(person.currencies[currency].pending[0].amount.toFullString())
								.to.equals(Decimal128.fromNumeric(10).toFullString())
						})

						it('Should partially complete a pending operation that reduces balance', async () => {
							const opid = new ObjectId('89fb0d1b05c509518b81ce3e')
							await user.balanceOps.add(currency, {
								opid,
								type: 'trade',
								amount: -20
							})

							const partialAmount = Decimal128.fromNumeric(10)

							await user.balanceOps.complete(currency, opid, rfOpid, partialAmount)
							const person = await Person.findById(user.id)
							expect(person.currencies[currency].pending).to.have.lengthOf(2)
							expect(person.currencies[currency].balance.available.toFullString())
								.to.equals(Decimal128.fromNumeric(30).toFullString())
							expect(person.currencies[currency].balance.locked.toFullString())
								.to.equals(Decimal128.fromNumeric(30).toFullString())
							expect(person.currencies[currency].pending[1].amount.toFullString())
								.to.equals(Decimal128.fromNumeric(-10).toFullString())
							// Checa se nãõ alterou a outra ordem
							expect(person.currencies[currency].pending[0].amount.toFullString())
								.to.equals(Decimal128.fromNumeric(20).toFullString())
						})

						it('Should complete an operation that was partially completed', async () => {
							const partialAmount = Decimal128.fromNumeric(10)
							await user.balanceOps.complete(currency, opid, rfOpid, partialAmount)

							await user.balanceOps.complete(currency, opid)
							const person = await Person.findById(user.id)
							expect(person.currencies[currency].pending).to.have.lengthOf(0)
							expect(person.currencies[currency].balance.available.toFullString())
								.to.equals(Decimal128.fromNumeric(70).toFullString())
							expect(person.currencies[currency].balance.locked.toFullString())
								.to.equals(Decimal128.fromNumeric(0).toFullString())
						})

						it('Should fail when the amount is bigger than the operation', async () => {
							const partialAmount = Decimal128.fromNumeric(21)

							await expect(user.balanceOps.complete(currency, opid, rfOpid, partialAmount))
								.to.eventually.be.rejectedWith('Amount provided is greater or equal than amount in order')
						})

						it('Should fail when the amount is the same as the operation', async () => {
							const partialAmount = Decimal128.fromNumeric(20)

							await expect(user.balanceOps.complete(currency, opid, rfOpid, partialAmount))
								.to.eventually.be.rejectedWith('Amount provided is greater or equal than amount in order')
						})

						it('Should append the opid of the responsable operation', async () => {
							const partialAmount = Decimal128.fromNumeric(10)

							await user.balanceOps.complete(currency, opid, rfOpid, partialAmount)
							const { completions } = await user.balanceOps.get(currency, opid)
							expect(completions.find(v => v.toHexString() === rfOpid.toHexString()))
								.to.be.an.instanceOf(ObjectId)
						})
					})

					describe('Testing operation locks', () => {
						it('Should lock an operation', async () => {
							const lockOpid = new ObjectId()
							await user.balanceOps.lock(currency, opid, lockOpid)
							const pending = await user.balanceOps.get(currency, opid)
							expect(pending.opid.toHexString()).to.equals(opid.toHexString())
							expect(pending.locked?.byOpid.toHexString())
								.to.equals(lockOpid.toHexString())
							expect(pending.locked?.timestamp).to.be.an.instanceOf(Date)
						})

						describe('When there is a locked operation', () => {
							const lockOpid = new ObjectId()

							beforeEach(async () => {
								await user.balanceOps.lock(currency, opid, lockOpid)
								const pending = await user.balanceOps.get(currency, opid)
								expect(pending.locked?.byOpid.toHexString())
									.to.equals(lockOpid.toHexString())
								expect(pending.locked?.timestamp).to.be.an.instanceOf(Date)
							})

							it('Should unlock an operation', async () => {
								await user.balanceOps.unlock(currency, opid, lockOpid)
								const pending = await user.balanceOps.get(currency, opid)
								expect(pending.locked.byOpid).to.be.undefined
							})

							it('Should not unlock if opid was not informed', async () => {
								await expect(user.balanceOps.unlock(currency, opid, undefined))
									.to.eventually.be.rejectedWith('OperationNotFound')
							})

							it('Should unlock an operation using the forced mode', async () => {
								await user.balanceOps.unlock(currency, opid, null, true)
								const pending = await user.balanceOps.get(currency, opid)
								expect(pending.locked.byOpid).to.be.undefined
							})

							it('Should fail when trying to complete it without the unlock key', async () => {
								await expect(user.balanceOps.complete(currency, opid))
									.to.eventually.be.rejectedWith('OperationNotFound')
							})

							it('Should fail when trying to complete it with an invalid opid', async () => {
								await expect(user.balanceOps.complete(currency, opid, new ObjectId()))
									.to.eventually.be.rejectedWith('OperationNotFound')
							})

							it('Should complete the operation if informed the correct unlock key', async () => {
								await user.balanceOps.complete(currency, opid, lockOpid)
							})

							it('Should fail when trying to partially complete it without the unlock key', async () => {
								const amount = Decimal128.fromString('1')
								await expect(user.balanceOps.complete(currency, opid, undefined, amount))
									.to.eventually.be
									.rejectedWith('rfOpid needs to be informed to partially complete an operation')
							})

							it('Should fail when trying to partially complete it with an invalid opid', async () => {
								const amount = Decimal128.fromString('1')
								await expect(user.balanceOps.complete(currency, opid, new ObjectId(), amount))
									.to.eventually.be.rejectedWith('OperationNotFound')
							})

							it('Should partially complete the operation if informed the correct unlock key', async () => {
								const amount = Decimal128.fromString('1')
								await user.balanceOps.complete(currency, opid, lockOpid, amount)
							})
						})
					})
				})
			})

			describe('Testing if returns updated values after instantiated', () => {
				it('Should return updated balance', async () => {
					const { available: availableBefore } = await user.getBalance(currency, true)

					const opid = new ObjectId()
					await user.balanceOps.add(currency, {
						opid,
						type: 'transaction',
						amount: 1
					})
					await user.balanceOps.complete(currency, opid)
					const { available } = await user.getBalance(currency, true)
					expect(+availableBefore).to.equals(+available - 1)
				})

				it('Should return updated accounts', async () => {
					const person = await Person.findById(user.id)
					const accountsBefore = person.currencies[currency].accounts

					person.currencies[currency].accounts.push('random-account')
					await person.save({ validateBeforeSave: false })

					const accounts = await user.getAccounts(currency)
					expect(accounts.length).to.equals(accountsBefore.length)
				})
			})
		})
	}
})
