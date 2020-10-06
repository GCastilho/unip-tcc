import '../../src/libs/extensions'
import { expect } from 'chai'
import { Decimal128, ObjectId } from 'mongodb'
import Person from '../../src/db/models/person'
import Transaction from '../../src/db/models/transaction'
import { currenciesObj } from '../../src/libs/currencies'
import * as CurrencyApi from '../../src/currencyApi'

describe('Testing operations on the currencyApi', () => {
	let userId: InstanceType<typeof Person>['_id']

	before(async () => {
		await Person.deleteMany({})

		const person = await Person.createOne('operations@example.com', 'userP@ss')
		userId = person['_id']

		// Manualmente seta o saldo disponível para 1
		person.currencies.bitcoin.balance.available = Decimal128.fromNumeric(1)
		await person.save()
	})

	describe('Testing withdraw', () => {
		let opid: ObjectId
		const amount = 0.011

		const account = 'operations-bitcoin'

		before(async () => {
			opid = await CurrencyApi.withdraw(userId, 'bitcoin', account, amount)
			expect(opid).to.be.an('object')
			expect(opid).to.be.instanceOf(ObjectId)
		})

		it('Should have saved the transaction', async () => {
			const tx = await Transaction.findById(opid)
			expect(tx).to.be.an('object')
		})

		it('Should have a valid fee', async () => {
			const tx = await Transaction.findById(opid)
			expect(tx.fee).to.be.a('number').and.greaterThan(0)
		})

		it('Should have saved the transaction with the correct amount', async () => {
			const tx = await Transaction.findById(opid)

			// Checa se o fee foi descontado
			expect(+tx.amount.toFullString()).to.be.lessThan(amount)
			expect(+tx.amount.toFullString() + tx.fee).to.equal(amount)

			// Checa se houve erro de arredondamento convertendo pra string
			expect(+tx.amount.toFullString())
				.to.equal(+(amount - tx.fee)
					.toFixed(currenciesObj.bitcoin.decimals))

			/*
			 * Checa se houve erros de arredondamento comparando as
			 * as casas decimais significativas
			 */
			const amount_decimals = tx.amount.toFullString().split('.')[1].length
			const fee_decimals = tx.fee.toString().split('.')[1].length
			const tst_amount_decimals = amount.toString().split('.')[1].length
			expect(tst_amount_decimals).to.be.at.most(Math.max(amount_decimals, fee_decimals))

			/*
			 * Checa se houve erros no arredondamento somando os valores
			 */
			const expoencial = 10 * currenciesObj.bitcoin.decimals
			const _tx_amount = Math.trunc(+tx.amount.toFullString() * expoencial)
			const _fee = Math.trunc(tx.fee * expoencial)
			const _tst_amount = Math.trunc(amount * expoencial)
			expect(_tx_amount + _fee).to.equal(_tst_amount)
		})

		it('Should return AmountOfRange if amount is lower than 2*fee', async () => {
			const { fee } = currenciesObj.bitcoin
			await expect(
				CurrencyApi.withdraw(userId, 'bitcoin', account, (2 * fee - 0.01 * fee))
			).to.eventually.be
				.rejectedWith(`Withdraw amount for bitcoin must be at least '${2 * fee}', but got ${2 * fee - 0.01 * fee}`)
		})
	})

	describe('Testing cancell_withdraw', () => {
		let opid: ObjectId

		beforeEach(async () => {
			const person = await Person.findById(userId)

			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies.bitcoin.balance.available = 10
			// @ts-expect-error Automaticamente convertido para Decimal128
			person.currencies.bitcoin.balance.locked = 0

			await person.save()

			opid = await CurrencyApi.withdraw(userId, 'bitcoin', 'operations-cancell-bitcoin', 1)
		})

		it('Should cancell a withdraw request', async () => {
			expect((await Transaction.findById(opid)).status).to.equals('ready')
			expect(await CurrencyApi.cancellWithdraw(userId, 'bitcoin', opid))
				.to.equal('cancelled')
			expect(await Transaction.findById(opid)).to.be.null

			const person = await Person.findById(userId)
			expect(person.currencies.bitcoin.balance.available.toFullString())
				.to.equals('10.0')
			expect(person.currencies.bitcoin.balance.locked.toFullString())
				.to.equals('0.0')
		})
	})
})
