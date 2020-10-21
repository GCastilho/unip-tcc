import '../../src/libs/extensions'
import { startSession } from 'mongoose'
import { Decimal128, ObjectId } from 'mongodb'
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import Person from '../../src/db/models/person'
import { currenciesObj } from '../../src/libs/currencies'

chai.use(chaiAsPromised)

describe('Testing BalanceOperations on the person model', () => {
	let userId: InstanceType<typeof Person>['_id']

	beforeEach(async () => {
		await Person.deleteMany({})
		const { _id } = await Person.createOne('balanceOps-test@email.com', 'userP@ss')

		const person = await Person.findByIdAndUpdate(_id, {
			$set: {
				['currencies.bitcoin.balance.available']: Decimal128.fromNumeric(50),
				['currencies.bitcoin.balance.locked']: Decimal128.fromNumeric(0)
			},
			$push: {
				['currencies.bitcoin.accounts']: 'bitcoin-account'
			}
		}, { new: true })

		userId = person._id
	})

	it('Should add a pending operation', async () => {
		await Person.balanceOps.add(userId, 'bitcoin', {
			opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
			type: 'transaction',
			amount: 20
		})

		const person = await Person.findById(userId)
		expect(person.currencies.bitcoin.pending).to.have.lengthOf(1)
		expect(person.currencies.bitcoin.pending[0]).to.be.an('object')
		expect(person.currencies.bitcoin.pending[0].opid.toHexString())
			.to.equals('89fb0d1b05c505618b81ce5e')
		expect(person.currencies.bitcoin.pending[0].amount).to.equal(20)
		expect(person.currencies.bitcoin.pending[0].type).to.equals('transaction')
	})

	it('Should add a pending operation using a session', async () => {
		const session = await startSession()
		session.startTransaction()

		await Person.balanceOps.add(userId, 'bitcoin', {
			opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
			type: 'transaction',
			amount: 20
		}, session)

		await session.commitTransaction()
		await session.endSession()

		const person = await Person.findById(userId)
		expect(person.currencies.bitcoin.pending).to.have.lengthOf(1)
		expect(person.currencies.bitcoin.pending[0]).to.be.an('object')
		expect(person.currencies.bitcoin.pending[0].opid.toHexString())
			.to.equals('89fb0d1b05c505618b81ce5e')
		expect(person.currencies.bitcoin.pending[0].amount).to.equal(20)
		expect(person.currencies.bitcoin.pending[0].type).to.equals('transaction')
	})

	it('Should decrement from the available balance', async () => {
		await Person.balanceOps.add(userId, 'bitcoin', {
			opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
			type: 'transaction',
			amount: -20
		})

		const person = await Person.findById(userId)
		expect(person.currencies.bitcoin.balance.available.toFullString())
			.to.equals(Decimal128.fromNumeric(30).toFullString())
		expect(person.currencies.bitcoin.balance.locked.toFullString())
			.to.equals(Decimal128.fromNumeric(20).toFullString())
	})

	it('Should fail to add negative operation greater than the available balance', async () => {
		await expect(Person.balanceOps.add(userId, 'bitcoin', {
			opid: new ObjectId('89fb0d1b05c505618b81ce5e'),
			type: 'transaction',
			amount: -60
		})).to.be.rejectedWith('NotEnoughFunds')

		const person = await Person.findById(userId)
		expect(person.currencies.bitcoin.balance.available.toFullString())
			.to.equals(Decimal128.fromNumeric(50).toFullString())
		expect(person.currencies.bitcoin.balance.locked.toFullString())
			.to.equals(Decimal128.fromNumeric(0).toFullString())
	})

	describe('When there is a pending operation', () => {
		const opid = new ObjectId('89fb0d1b05c505618b81ce5e')

		beforeEach(async () => {
			await Person.findByIdAndUpdate(userId, {
				$set: {
					['currencies.bitcoin.balance.available']: Decimal128.fromNumeric(50),
					['currencies.bitcoin.balance.locked']: Decimal128.fromNumeric(0),
					['currencies.bitcoin.accounts']: []
				}
			})

			await Person.balanceOps.add(userId, 'bitcoin', {
				opid,
				type: 'transaction',
				amount: 20
			})
		})

		it('Should have the amount incremented on the locked balance', async () => {
			const person = await Person.findById(userId)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals(Decimal128.fromNumeric(50).toFullString())
			expect(person.currencies.bitcoin.balance.locked.toFullString())
				.to.equals(Decimal128.fromNumeric(20).toFullString())
		})

		it('Should return a pending operation', async () => {
			const op = await Person.balanceOps.get(userId, 'bitcoin', opid)
			expect(op).to.be.an('object')
			expect(op.type).to.equals('transaction')
			expect(op.amount).to.equal(20)
		})

		it('Should return a pending operation using a session', async () => {
			const session = await startSession()
			session.startTransaction()

			const op = await Person.balanceOps.get(userId, 'bitcoin', opid, session)

			await session.commitTransaction()
			await session.endSession()

			expect(op).to.be.an('object')
			expect(op.type).to.equals('transaction')
			expect(op.amount).to.equal(20)
		})

		it('Should cancel a pending operation', async () => {
			await Person.balanceOps.cancel(userId, 'bitcoin', opid)
			const person = await Person.findById(userId)
			expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals(Decimal128.fromNumeric(50).toFullString())
			expect(person.currencies.bitcoin.balance.locked.toFullString())
				.to.equals(Decimal128.fromNumeric(0).toFullString())
		})

		it('Should cancel a pending operation using a session', async () => {
			const session = await startSession()
			session.startTransaction()

			await Person.balanceOps.cancel(userId, 'bitcoin', opid, session)

			await session.commitTransaction()
			await session.endSession()

			const person = await Person.findById(userId)
			expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals(Decimal128.fromNumeric(50).toFullString())
			expect(person.currencies.bitcoin.balance.locked.toFullString())
				.to.equals(Decimal128.fromNumeric(0).toFullString())
		})

		it('Should complete a pending operation', async () => {
			await Person.balanceOps.complete(userId, 'bitcoin', opid)
			const person = await Person.findById(userId)
			expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals(Decimal128.fromNumeric(70).toFullString())
			expect(person.currencies.bitcoin.balance.locked.toFullString())
				.to.equals(Decimal128.fromNumeric(0).toFullString())
		})

		it('Should complete a pending operation using a session', async () => {
			const session = await startSession()
			session.startTransaction()

			await Person.balanceOps.complete(userId, 'bitcoin', opid, session)

			await session.commitTransaction()
			await session.endSession()

			const person = await Person.findById(userId)
			expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals(Decimal128.fromNumeric(70).toFullString())
			expect(person.currencies.bitcoin.balance.locked.toFullString())
				.to.equals(Decimal128.fromNumeric(0).toFullString())
		})

		it('Should update balance with truncated amount', async () => {
			// Completa a operação original
			await Person.balanceOps.complete(userId, 'bitcoin', opid)
			const amount = '1.1234567891011121314151617181920'
			await Person.balanceOps.add(userId, 'bitcoin', {
				opid,
				amount,
				type: 'transaction'
			})
			await Person.balanceOps.complete(userId, 'bitcoin', opid)
			const person = await Person.findById(userId)
			const truncatedDecimals = amount.split('.')[1]
				.slice(0, currenciesObj.bitcoin.decimals)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals('71.' + truncatedDecimals)
		})

		describe('And is requested to partially complete it', () => {
			it('Should partially complete a pending operation that increases balance', async () => {
				const partialAmount = 10

				await Person.balanceOps.complete(userId, 'bitcoin', opid, null, partialAmount)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(1)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(60).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(10).toFullString())
				expect(person.currencies.bitcoin.pending[0].amount).to.equal(10)
			})

			it('Should partially complete a pending operation that reduces balance', async () => {
				const opid = new ObjectId('89fb0d1b05c509518b81ce3e')
				await Person.balanceOps.add(userId, 'bitcoin', {
					opid,
					type: 'trade',
					amount: -20
				})

				const partialAmount = 10

				await Person.balanceOps.complete(userId, 'bitcoin', opid, null, partialAmount)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(2)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(30).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(30).toFullString())
				expect(person.currencies.bitcoin.pending[1].amount).to.equal(-10)
				// Checa se não alterou a outra ordem
				expect(person.currencies.bitcoin.pending[0].amount).to.equal(20)
			})

			it('Should complete an operation that was partially completed', async () => {
				const partialAmount = 10
				await Person.balanceOps.complete(userId, 'bitcoin', opid, null, partialAmount)

				await Person.balanceOps.complete(userId, 'bitcoin', opid)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(70).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(0).toFullString())
			})

			it('Should partially complete a pending operation using a session', async () => {
				const partialAmount = 10

				const session = await startSession()
				session.startTransaction()

				await Person.balanceOps.complete(userId, 'bitcoin', opid, session, partialAmount)

				await session.commitTransaction()
				await session.endSession()

				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(1)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(60).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(10).toFullString())
				expect(person.currencies.bitcoin.pending[0].amount).to.equal(10)
			})

			it('Should fail when the amount is bigger than the operation', async () => {
				const partialAmount = 21

				await expect(Person.balanceOps.complete(userId, 'bitcoin', opid, null, partialAmount))
					.to.eventually.be.rejectedWith('Amount provided is greater or equal than amount in order')
			})

			it('Should complete totally when the amount is the same as the operation', async () => {
				const partialAmount = 20

				await Person.balanceOps.complete(userId, 'bitcoin', opid, null, partialAmount)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(70).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(0).toFullString())
			})
		})
	})
})
