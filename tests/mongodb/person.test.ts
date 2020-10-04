import '../../src/libs/extensions'
import randomstring from 'randomstring'
import { expect } from 'chai'
import { Decimal128, ObjectId } from 'mongodb'
import Person from '../../src/db/models/person'
import { currencyNames, currenciesObj } from '../../src/libs/currencies'

describe('Testing person model', () => {
	const db_name = Person.db.name
	const coll_name = Person.collection.name

	beforeEach(async () => {
		await Person.deleteMany({})
	})

	it('Should save a document', async () => {
		const person = new Person({
			email: 'person-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 32 }),
				password_hash: randomstring.generate({ length: 128 })
			}
		})

		await expect(person.save()).to.eventually.fulfilled
	})

	it('Should save a document only informing email and password', async () => {
		const person = new Person({
			email: 'person-test@email.com',
			credentials: {
				password: 'randomP@ss'
			}
		})

		await expect(person.save()).to.eventually.fulfilled
	})

	it('Should not save two documents with the same email', async () => {
		const person = new Person({
			email: 'person-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 32 }),
				password_hash: randomstring.generate({ length: 128 })
			}
		})

		await expect(person.save()).to.eventually.fulfilled

		const person2 = new Person({
			email: 'person-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 32 }),
				password_hash: randomstring.generate({ length: 128 })
			}
		})

		await expect(person2.save()).to.eventually.be
			.rejectedWith(`E11000 duplicate key error collection: ${db_name}.${coll_name} index: email`)
	})

	it('Should not save a document that has salt with length less than 32', async () => {
		const person = new Person({
			email: 'person-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 31 }),
				password_hash: randomstring.generate({ length: 128 })
			}
		})

		await expect(person.save()).to.eventually.be
			.rejectedWith('salt can not have length less than 32 characters')
	})

	it('Should not save a document that has password_hash with length less than 128', async () => {
		const person = new Person({
			email: 'person-test@email.com',
			credentials: {
				salt: randomstring.generate({ length: 32 }),
				password_hash: randomstring.generate({ length: 127 })
			}
		})

		await expect(person.save()).to.eventually.be
			.rejectedWith('password_hash can not have length less than 128 characters')
	})

	it('Should not save the same account in two different documents')

	describe('Testing credentials', () => {
		let person: InstanceType<typeof Person>
		const password = 'randomP@ass'

		beforeEach(async () => {
			person = await new Person({
				email: 'person@test.com',
				credentials: { password }
			}).save()
		})

		it('Should NOT return the password on the password property', () => {
			expect(person.credentials.password).to.not.equals(password)
		})

		describe('Testing check method', () => {
			it('Should return TRUE if the password is equal to the informed', () => {
				expect(person.credentials.check(password)).to.be.true
			})

			it('Should return FALSE if the password is NOT equal to the informed', () => {
				expect(person.credentials.check('notThePassword')).to.be.false
			})
		})

		it('Should update the password_hash if a new password is set', async () => {
			const old_hash = person.credentials.password_hash
			person.credentials.password = 'newPassword'
			expect(person.credentials.password_hash).to.not.equals(old_hash)
		})

		it('Should return TRUE to a password check after setting a new password', async () => {
			person.credentials.password = 'newPassword'
			expect(person.credentials.check('newPassword')).to.be.true
		})
	})

	describe('When there is a document on the database', () => {
		let person: InstanceType<typeof Person>

		beforeEach(async () => {
			person = await new Person({
				email: 'person-test@email.com',
				credentials: {
					salt: randomstring.generate({ length: 32 }),
					password_hash: randomstring.generate({ length: 128 })
				}
			}).save()
		})

		for (const currency of currencyNames) {
			describe(`And is requested an operation on ${currency}`, () => {
				it('Should not save available balance less than zero', async () => {
					person.currencies[currency].balance.available = Decimal128.fromString('-1')
					await expect(person.save()).to.eventually.be
						.rejectedWith('Available balance can not be less than 0')
				})

				it('Should not save locked balance less than zero', async () => {
					person.currencies[currency].balance.locked = Decimal128.fromString('-1')
					await expect(person.save()).to.eventually.be
						.rejectedWith('Locked balance can not be less than 0')
				})

				it('Should truncate the available balance beyond supported decimals', async () => {
					const decimals = currenciesObj[currency].decimals
					const originalNumber = '1.1234567891011121314151617181920'
					const truncatedNumber = originalNumber.slice(0, decimals + 2) // +2 pcausa do '1.'
					person.currencies[currency].balance.available = Decimal128.fromString(originalNumber)
					await person.save()
					expect(person.currencies[currency].balance.available.toFullString())
						.to.equals(truncatedNumber)
				})

				it('Should truncate the locked balance beyond supported decimals', async () => {
					const decimals = currenciesObj[currency].decimals
					const originalNumber = '1.1234567891011121314151617181920'
					const truncatedNumber = originalNumber.slice(0, decimals + 2) // +2 pcausa do '1.'
					person.currencies[currency].balance.locked = Decimal128.fromString(originalNumber)
					await person.save()
					expect(person.currencies[currency].balance.locked.toFullString())
						.to.equals(truncatedNumber)
				})

				it('Should not add pending operation with ZERO amount', async () => {
					person.currencies[currency].pending.push({
						opid: new ObjectId(),
						type: 'transaction',
						amount: Decimal128.fromString('0')
					})
					await expect(person.save()).to.eventually.be
						.rejectedWith('Amount can not be zero')
				})

				it('Should not save the same account in the same document', async () => {
					const account = 'totally-valid-account'
					person.currencies[currency].accounts.push(account)
					person.currencies[currency].accounts.push(account)
					await expect(person.save()).to.eventually.be
						.rejectedWith('New account can not be equal to existing account')
				})
			})
		}
	})
})
