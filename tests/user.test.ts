import '../src/libs'
import { Decimal128, ObjectId } from 'mongodb'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as UserApi from '../src/userApi'
import * as CurrencyApi from '../src/currencyApi'
import User from '../src/userApi/user'
import Person from '../src/db/models/person'

chai.use(chaiAsPromised)

describe('Testing UserApi', () => {
	let user: User

	for (const currency of CurrencyApi.currencies) {
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
				it('Should not fail if password is correct', () => {
					expect(() => user.checkPassword('userP@ss')).to.not.throw('InvalidPassword')
				})

				it('Should throw InvalidPassword if password is incorrect', () => {
					expect(() => user.checkPassword('invalidP@ss')).to.throw('InvalidPassword')
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

				it('Should add a completed operation')

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
				})
			})

			describe('Testing if returns updated values after instantiated', () => {
				it('Should return updated balance')

				it('Should return updated accounts')
			})
		})
	}
})
