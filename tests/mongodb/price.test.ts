import { expect } from 'chai'
import Price from '../../src/db/models/price'

describe.only('testing pricehistory collection', async () => {
	let priceDoc: InstanceType<typeof Price>

	beforeEach(async () => {
		priceDoc = new Price({
			price: 1,
			type: 'buy',
			currencies: ['nano', 'bitcoin']
		})
	})

	it('Should validate a correct document without problems', async () => {
		await expect(priceDoc.validate()).to.eventually.be.fulfilled
	})

	it('Should re-order the saved array', async () => {
		await expect(priceDoc.save()).to.eventually.be.fulfilled
		expect(priceDoc.currencies[0] < priceDoc.currencies[1], 'the array was not reordered').to.be.true
	})

	it('Should fail if there is more than 2 currencies in currencies[]', async () => {
		priceDoc.currencies.push('bitcoin')
		await expect(priceDoc.validate()).to.eventually
			.be.rejectedWith('currencies lenght must be two and currency type must be a SuportedCurrencies')
	})

	it('Should fail if there is less than 2 currencies in currencies[]', async () => {
		// @ts-expect-error Testando uma entrada a menos do que o nescessario
		priceDoc.currencies = ['bitcoin']
		await expect(priceDoc.validate()).to.eventually
			.be.rejectedWith('currencies lenght must be two and currency type must be a SuportedCurrencies')
	})

	it('Should fail if a currency is not a suported currency', async () => {
		// @ts-expect-error Testando entradas invalidas
		priceDoc.currencies = ['currencyManeira', 'currencyMaisManeira']
		await expect(priceDoc.validate()).to.eventually
			.be.rejectedWith('currencies lenght must be two and currency type must be a SuportedCurrencies')
	})
})
