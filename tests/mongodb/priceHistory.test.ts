import { expect } from 'chai'
import PriceHistory from '../../src/db/models/priceHistory'

describe.only('testing pricehistory collection', async () => {
	let priceHistoryDoc: InstanceType<typeof PriceHistory>

	beforeEach(async () => {
		new PriceHistory({
			initPrice: 10,
			finalPrice: 12,
			maxPrice: 25,
			minPrice: 5,
			duration: 10000,
			currencies: ['nano', 'bitcoin']
		})
	})

	it('Should validate a correct document without problems', async () => {
		await expect(priceHistoryDoc.validate()).to.eventually.be.fulfilled
	})

	it('Should re-order the saved array', async () => {
		await expect(priceHistoryDoc.save()).to.eventually.be.fulfilled
		expect(priceHistoryDoc.currencies[0] < priceHistoryDoc.currencies[1], 'the array was not reordered').to.be.true
	})

	it('Should fail if there is more than 2 currencies in currencies[]', async () => {
		priceHistoryDoc.currencies.push('bitcoin')
		await expect(priceHistoryDoc.validate()).to.eventually
			.be.rejectedWith('currencies lenght must be two and currency type must be a SuportedCurrencies')
	})

	it('Should fail if there is less than 2 currencies in currencies[]', async () => {
		// @ts-expect-error Testando uma entrada a menos do que o nescessario
		priceHistoryDoc.currencies = ['bitcoin']
		await expect(priceHistoryDoc.validate()).to.eventually
			.be.rejectedWith('currencies lenght must be two and currency type must be a SuportedCurrencies')
	})

	it('Should fail if a currency is not a suported currency', async () => {
		// @ts-expect-error Testando entradas invalidas
		priceHistoryDoc.currencies = ['currencyManeira', 'currencyMaisManeira']
		await expect(priceHistoryDoc.validate()).to.eventually
			.be.rejectedWith('currencies lenght must be two and currency type must be a SuportedCurrencies')
	})
})
