import '../../src/libs/extensions'
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
		expect(person.currencies.bitcoin.pending[0].amount.toFullString())
			.to.equals(Decimal128.fromNumeric(20).toFullString())
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
			expect(op.amount.toFullString())
				.to.equals(Decimal128.fromNumeric(20).toFullString())
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

		it('Should complete a pending operation', async () => {
			await Person.balanceOps.complete(userId, 'bitcoin', opid)
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
			const rfOpid = new ObjectId()

			it('Should partially complete a pending operation that increases balance', async () => {
				const partialAmount = Decimal128.fromNumeric(10)

				await Person.balanceOps.complete(userId, 'bitcoin', opid, rfOpid, partialAmount)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(1)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(60).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(10).toFullString())
				expect(person.currencies.bitcoin.pending[0].amount.toFullString())
					.to.equals(Decimal128.fromNumeric(10).toFullString())
			})

			it('Should partially complete a pending operation that reduces balance', async () => {
				const opid = new ObjectId('89fb0d1b05c509518b81ce3e')
				await Person.balanceOps.add(userId, 'bitcoin', {
					opid,
					type: 'trade',
					amount: -20
				})

				const partialAmount = Decimal128.fromNumeric(10)

				await Person.balanceOps.complete(userId, 'bitcoin', opid, rfOpid, partialAmount)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(2)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(30).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(30).toFullString())
				expect(person.currencies.bitcoin.pending[1].amount.toFullString())
					.to.equals(Decimal128.fromNumeric(-10).toFullString())
				// Checa se nãõ alterou a outra ordem
				expect(person.currencies.bitcoin.pending[0].amount.toFullString())
					.to.equals(Decimal128.fromNumeric(20).toFullString())
			})

			it('Should complete an operation that was partially completed', async () => {
				const partialAmount = Decimal128.fromNumeric(10)
				await Person.balanceOps.complete(userId, 'bitcoin', opid, rfOpid, partialAmount)

				await Person.balanceOps.complete(userId, 'bitcoin', opid)
				const person = await Person.findById(userId)
				expect(person.currencies.bitcoin.pending).to.have.lengthOf(0)
				expect(person.currencies.bitcoin.balance.available.toFullString())
					.to.equals(Decimal128.fromNumeric(70).toFullString())
				expect(person.currencies.bitcoin.balance.locked.toFullString())
					.to.equals(Decimal128.fromNumeric(0).toFullString())
			})

			it('Should fail when the amount is bigger than the operation', async () => {
				const partialAmount = Decimal128.fromNumeric(21)

				await expect(Person.balanceOps.complete(userId, 'bitcoin', opid, rfOpid, partialAmount))
					.to.eventually.be.rejectedWith('Amount provided is greater or equal than amount in order')
			})

			it('Should fail when the amount is the same as the operation', async () => {
				const partialAmount = Decimal128.fromNumeric(20)

				await expect(Person.balanceOps.complete(userId, 'bitcoin', opid, rfOpid, partialAmount))
					.to.eventually.be.rejectedWith('Amount provided is greater or equal than amount in order')
			})

			it('Should append the opid of the responsable operation', async () => {
				const partialAmount = Decimal128.fromNumeric(10)

				await Person.balanceOps.complete(userId, 'bitcoin', opid, rfOpid, partialAmount)
				const { completions } = await Person.balanceOps.get(userId, 'bitcoin', opid)
				expect(completions.find(v => v.toHexString() === rfOpid.toHexString()))
					.to.be.an.instanceOf(ObjectId)
			})
		})

		describe('Testing operation locks', () => {
			it('Should lock an operation', async () => {
				const lockOpid = new ObjectId()
				await Person.balanceOps.lock(userId, 'bitcoin', opid, lockOpid)
				const pending = await Person.balanceOps.get(userId, 'bitcoin', opid)
				expect(pending.opid.toHexString()).to.equals(opid.toHexString())
				expect(pending.locked?.byOpid.toHexString())
					.to.equals(lockOpid.toHexString())
				expect(pending.locked?.timestamp).to.be.an.instanceOf(Date)
			})

			describe('When there is a locked operation', () => {
				const lockOpid = new ObjectId()

				beforeEach(async () => {
					await Person.balanceOps.lock(userId, 'bitcoin', opid, lockOpid)
					const pending = await Person.balanceOps.get(userId, 'bitcoin', opid)
					expect(pending.locked?.byOpid.toHexString())
						.to.equals(lockOpid.toHexString())
					expect(pending.locked?.timestamp).to.be.an.instanceOf(Date)
				})

				it('Should unlock an operation', async () => {
					await Person.balanceOps.unlock(userId, 'bitcoin', opid, lockOpid)
					const pending = await Person.balanceOps.get(userId, 'bitcoin', opid)
					expect(pending.locked.byOpid).to.be.undefined
				})

				it('Should not unlock if opid was not informed', async () => {
					await expect(Person.balanceOps.unlock(userId, 'bitcoin', opid, undefined))
						.to.eventually.be.rejectedWith('OperationNotFound')
				})

				it('Should unlock an operation using the forced mode', async () => {
					await Person.balanceOps.unlock(userId, 'bitcoin', opid, null, true)
					const pending = await Person.balanceOps.get(userId, 'bitcoin', opid)
					expect(pending.locked.byOpid).to.be.undefined
				})

				it('Should fail when trying to complete it without the unlock key', async () => {
					await expect(Person.balanceOps.complete(userId, 'bitcoin', opid))
						.to.eventually.be.rejectedWith('OperationNotFound')
				})

				it('Should fail when trying to complete it with an invalid opid', async () => {
					await expect(Person.balanceOps.complete(userId, 'bitcoin', opid, new ObjectId()))
						.to.eventually.be.rejectedWith('OperationNotFound')
				})

				it('Should complete the operation if informed the correct unlock key', async () => {
					await Person.balanceOps.complete(userId, 'bitcoin', opid, lockOpid)
				})

				it('Should fail when trying to partially complete it without the unlock key', async () => {
					const amount = Decimal128.fromString('1')
					await expect(Person.balanceOps.complete(userId, 'bitcoin', opid, undefined, amount))
						.to.eventually.be
						.rejectedWith('rfOpid needs to be informed to partially complete an operation')
				})

				it('Should fail when trying to partially complete it with an invalid opid', async () => {
					const amount = Decimal128.fromString('1')
					await expect(Person.balanceOps.complete(userId, 'bitcoin', opid, new ObjectId(), amount))
						.to.eventually.be.rejectedWith('OperationNotFound')
				})

				it('Should partially complete the operation if informed the correct unlock key', async () => {
					const amount = Decimal128.fromString('1')
					await Person.balanceOps.complete(userId, 'bitcoin', opid, lockOpid, amount)
				})
			})
		})
	})
})
