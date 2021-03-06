import { expect } from 'chai'
import { currencies, truncateAmount } from '../../src/libs/currencies'

describe('Testing currency library', () => {
	// Vai ser arredondado se for mais preciso q isso
	const rawAmount = 1.123456789101112
	const rawAmountString = '1.1234567891011121314151617181920'

	it('Should NOT truncate if the currency was not found', () => {
		const truncated = truncateAmount(rawAmount, 'obamas')
		expect(truncated).to.be.a('number').that.does.equal(rawAmount)
	})

	for (const currency of currencies) {
		it(`Should truncate the amount using decimals from ${currency.name}`, () => {
			const truncated = truncateAmount(rawAmount, currency.name)
			expect(truncated).to.be.a('number').that.does.not.equal(rawAmount)

			const [integer, decimals] = truncated.toString().split('.')
			expect(integer).to.equal(Math.trunc(rawAmount).toString())
			expect(decimals).to.have.lengthOf(currency.decimals)

			expect(decimals).to.equals(
				rawAmount.toString().split('.')[1].slice(0, currency.decimals)
			)
		})

		it(`Should truncate the amount as a string using decimals from ${currency.name}`, () => {
			const truncated = truncateAmount(rawAmountString, currency.name)
			expect(truncated).to.be.a('number').that.does.not.equal(rawAmountString)

			const [integer, decimals] = truncated.toString().split('.')
			expect(integer).to.equal(rawAmountString.split('.')[0])
			expect(decimals).to.have.lengthOf(currency.decimals)

			expect(decimals).to.equals(
				rawAmountString.toString().split('.')[1].slice(0, currency.decimals)
			)
		})
	}
})
