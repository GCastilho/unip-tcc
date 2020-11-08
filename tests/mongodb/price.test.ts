import { expect } from 'chai'
import Price from '../../src/db/models/price'
import type { PriceUpdate } from '../../interfaces/market'
import type { SuportedCurrencies } from '../../src/libs/currencies'

/** Type dos valores necessários par preencher o price */
type BasePrice = {
	open: number
	close: number
	high: number
	low: number
	startTime: number
	duration: number
	currencies: [SuportedCurrencies, SuportedCurrencies]
};

describe('Testing pricehistory collection', async () => {
	let priceDoc: InstanceType<typeof Price>

	beforeEach(async () => {
		priceDoc = new Price({
			open: 10,
			close: 12,
			high: 25,
			low: 5,
			duration: 60000,
			startTime: Date.now(),
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

	it('Should fail if duration is negative or ZERO', async () => {
		const price = new Price({
			open: 10,
			close: 12,
			high: 25,
			low: 5,
			duration: -60000,
			startTime: Date.now(),
			currencies: ['nano', 'bitcoin']
		})
		await expect(price.save()).to.eventually
			.be.rejectedWith('duration needs to be greater than zero')
	})

	it('Should fail if the price is negative or ZERO', async () => {
		const price = new Price({
			open: -10,
			close: -12,
			high: -25,
			low: -5,
			duration: 60000,
			startTime: Date.now(),
			currencies: ['nano', 'bitcoin']
		})
		await expect(price.save()).to.eventually.be.rejected
	})

	describe('When calling summarize method', () => {
		const docCount = 60
		const prices: BasePrice[] = []

		beforeEach(async () => {
			await Price.deleteMany({})

			/** Timestamp atual arredondado para o início da hora */
			const roundedTimestamp = Date.now() - (Date.now() % (60 * 60000))

			/** Objeto que será a base para fazer os docs de preço */
			const basePrice: BasePrice = {
				open: 1,
				close: 0.75,
				high: 1.1,
				low: 0.5,
				startTime: roundedTimestamp - 31 * 24 * 60 * 60000, // doc mais antigo de 31d atrás
				duration: 60 * 60000,
				currencies: ['bitcoin', 'nano']
			}

			for (let i = 0; i < docCount; i++) {
				prices.push({
					open: 1.1 * basePrice.open + i % 2,
					close: 0.4 * basePrice.close + i % 2,
					high: 1.5 * basePrice.high + i % 2,
					low: 0.2 * basePrice.low + i % 2,
					startTime: basePrice.startTime + i * 60000, // espaça cada doc em 1 min
					duration: 60000,
					currencies: ['bitcoin', 'nano']
				})
			}
			for (const p of prices) {
				expect(
					p.high >= p.low && p.high >= p.close && p.low <= p.close,
					`Invalid prices value for: ${JSON.stringify(p, null, 8)}`
				).to.be.true
			}
			// Salva em seguida para não perder a ordem
			for (const p of prices) {
				await Price.create({ ...p })
			}
		})

		it('Should summarize smaller price entries into documents of one hour', async () => {
			await Price.summarize(['bitcoin', 'nano'])
			const docs = await Price.find({})
			expect(docs).to.have
				.lengthOf(Math.floor(docCount / 60) + Number(Boolean(docCount % 60)))
			const doc = docs[0]
			expect(doc.open).to.equal(prices[0].open)
			expect(doc.close).to.equal((prices[59] || prices[prices.length - 1]).close)
			expect(doc.high).to.equal(Math.max(...prices.slice(0, 59).map(p => p.high)))
			expect(doc.low).to.equal(Math.min(...prices.slice(0, 59).map(p => p.low)))
			expect(doc.startTime).to.equal(doc.startTime - (doc.startTime % 60 * 60000))
			expect(doc.duration).to.equal(60 * 60000)
		})

		it('Should not fail to summarize if currencies are not sorted', async () => {
			await Price.summarize(['nano', 'bitcoin'])
			expect(await Price.find({})).have
				.lengthOf(Math.floor(docCount / 60) + Number(Boolean(docCount % 60)))
		})

		it('Should NOT summarize documents that are younger then 30 days', async () => {
			// Faz os documentos serem mais recentes que 15 dias
			const docs = await Price.find({})
			docs.forEach(p => p.startTime += 15 * 24 * 60 * 60000)
			await Promise.all(docs.map(p => p.save()))

			await Price.summarize(['nano', 'bitcoin'])
			expect(await Price.find({})).have.lengthOf(prices.length)
		})

		it('Should NOT modify the database if no currencies were informed', async () => {
			// @ts-expect-error Testando um input vazio
			await Price.summarize([])
			expect(await Price.find({})).have.lengthOf(prices.length)
		})
	})

	describe('When calling createOne', () => {
		const updtModel: PriceUpdate = {
			price: 10,
			type: 'buy',
			currencies: ['nano', 'bitcoin']
		}

		beforeEach(async () => {
			await Price.deleteMany({})
		})

		it('Should create a new document on the prices collection', async () => {
			await Price.createOne(updtModel)
			const doc = await Price.findOne({})
			expect(doc.open).to.equal(updtModel.price)
			expect(doc.close).to.equal(updtModel.price)
			expect(doc.high).to.equal(updtModel.price)
			expect(doc.low).to.equal(updtModel.price)
			expect(doc.duration).to.equal(60000)
		})

		it('Should NOT update any document is no currencies are informed', async () => {
			// @ts-expect-error Testando não informar currencies
			await expect(Price.createOne({ price: 1 })).to.eventually
				.be.rejectedWith('Supported currencies array must have length of 2')
		})

		it('Should NOT fail if the price is ZERO', async () => {
			await expect(Price.createOne({ ...updtModel, price: 0 })).to.eventually
				.be.fulfilled
		})

		it('Should NOT fail if the price is Infinity', async () => {
			await expect(Price.createOne({ ...updtModel, price: Infinity })).to.eventually
				.be.fulfilled
		})

		it('Should fail if the price is negative', async () => {
			await expect(Price.createOne({ ...updtModel, price: -1 })).to.eventually
				.be.rejectedWith('Price can NOT be a negative number')
		})

		describe('When there is a price document in the collection', () => {
			let priceDoc: InstanceType<typeof Price>

			beforeEach(async () => {
				priceDoc = await new Price({
					open: 10,
					close: 12,
					high: 25,
					low: 5,
					duration: 60000,
					// Esse startTime pode falhar se o Date.now() mudar pro próximo segundo
					startTime: Date.now() - (Date.now() % 60000),
					currencies: ['bitcoin', 'nano']
				}).save()
			})

			it('Should update the close field on update', async () => {
				await Price.createOne(updtModel)

				const docs = await Price.find({})
				expect(docs).to.have.lengthOf(1)
				const doc = docs[0]

				expect(doc.close).to.equal(updtModel.price)
				expect(doc.close).to.not.be.equal(priceDoc.close)
			})

			it('Should update the high field of the price is higher than the current high', async () => {
				await Price.createOne({ ...updtModel, price: priceDoc.high + 1 })

				const docs = await Price.find({})
				expect(docs).to.have.lengthOf(1)
				const doc = docs[0]

				expect(doc.high).to.equal(priceDoc.high + 1)
			})

			it('Should NOT update the high field of the price is not higher than the current high', async () => {
				await Price.createOne({ ...updtModel, price: priceDoc.high - 1 })

				const docs = await Price.find({})
				expect(docs).to.have.lengthOf(1)
				const doc = docs[0]

				expect(doc.high).to.not.equal(priceDoc.high - 1)
				expect(doc.high).to.equal(priceDoc.high)
			})

			it('Should update the low field of the price is lower than the current low', async () => {
				await Price.createOne({ ...updtModel, price: priceDoc.low - 1 })

				const docs = await Price.find({})
				expect(docs).to.have.lengthOf(1)
				const doc = docs[0]

				expect(doc.low).to.equal(priceDoc.low - 1)
			})

			it('Should NOT update the low field of the price is not lower than the current low', async () => {
				await Price.createOne({ ...updtModel, price: priceDoc.low + 1 })

				const docs = await Price.find({})
				expect(docs).to.have.lengthOf(1)
				const doc = docs[0]

				expect(doc.low).to.not.equal(priceDoc.low + 1)
				expect(doc.low).to.equal(priceDoc.low)
			})
		})
	})
})
