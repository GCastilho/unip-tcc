import '../../src/libs/extensions'
import { expect } from 'chai'
import { Decimal128, ObjectId } from 'mongodb'
import Person from '../../src/db/models/person'
import Checklist from '../../src/db/models/checklist'
import Transaction from '../../src/db/models/transaction'
import { currencyNames, currenciesObj } from '../../src/libs/currencies'
import * as CurrencyApi from '../../src/currencyApi'
import * as UserApi from '../../src/userApi'
import type User from '../../src/userApi/user'

describe('Testing operations on the currencyApi', () => {
	let user: User

	before(async () => {
		await Person.deleteMany({})
		await Checklist.deleteMany({})

		user = await UserApi.createUser('operations@example.com', 'userP@ss')

		// Manualmente seta o saldo disponível para 1
		for (const currency of currencyNames) {
			user.person.currencies[currency].balance.available = Decimal128.fromNumeric(1)
		}
		await user.person.save()
	})

	for (const currency of currencyNames) {
		describe(`Testing withdraw for ${currency}`, () => {
			let opid: ObjectId
			const amount = 0.011

			const account = `operations-${currency}`

			before(async () => {
				opid = await CurrencyApi.withdraw(user, currency, account, amount)
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
						.toFixed(currenciesObj[currency].decimals))

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
				const expoencial = 10 * currenciesObj[currency].decimals
				const _tx_amount = Math.trunc(+tx.amount.toFullString() * expoencial)
				const _fee = Math.trunc(tx.fee * expoencial)
				const _tst_amount = Math.trunc(amount * expoencial)
				expect(_tx_amount + _fee).to.equal(_tst_amount)
			})

			it('Should return AmountOfRange if amount is lower than 2*fee', async () => {
				const { fee } = currenciesObj[currency]
				await expect(
					CurrencyApi.withdraw(user, currency, account, (2 * fee - 0.01 * fee))
				).to.eventually.be
					.rejectedWith(`Withdraw amount for ${currency} must be at least '${2 * fee}', but got ${2 * fee - 0.01 * fee}`)
			})
		})

		describe(`Testing cancell_withdraw for ${currency}`, () => {
			let opid: ObjectId

			beforeEach(async () => {
				// @ts-expect-error
				user.person.currencies[currency].balance.available = 10
				// @ts-expect-error
				user.person.currencies[currency].balance.locked = 0
				await user.person.save()

				opid = await CurrencyApi.withdraw(user, currency, `operations-cancell-${currency}`, 1)
			})

			it('Should cancell a withdraw request', async () => {
				expect((await Transaction.findById(opid)).status).to.equals('ready')
				expect(await CurrencyApi.cancellWithdraw(user.id, currency, opid))
					.to.equal('cancelled')
				expect(await Transaction.findById(opid)).to.be.null

				const person = await Person.findById(user.id)
				expect(person.currencies[currency].balance.available.toFullString())
					.to.equals('10.0')
				expect(person.currencies[currency].balance.locked.toFullString())
					.to.equals('0.0')
			})
		})
	}
})
