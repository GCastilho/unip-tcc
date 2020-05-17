import randomstring from 'randomstring'
import { expect } from 'chai'
import Person, { Person as P } from '../../src/db/models/person'
import * as CurrencyApi from '../../src/currencyApi'

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

	describe('When there is a document on the database', () => {
		let person: P

		beforeEach(async () => {
			person = await new Person({
				email: 'person-test@email.com',
				credentials: {
					salt: randomstring.generate({ length: 32 }),
					password_hash: randomstring.generate({ length: 128 })
				}
			}).save()
		})

		for (const currency of CurrencyApi.currencies) {
			describe(`And is requested an operation on ${currency}`, () => {
				it('Should not save available balance less than zero')

				it('Should not save locked balance less than zero')

				it('Should truncate the available balance beyond supported decimals')

				it('Should truncate the locked balance beyond supported decimals')

				it('Should not save two pendings operations with the same opid')

				// Add and check enum from pending type

				it('Should truncate pending amount beyond supported decimals')
			})
		}
	})
})
