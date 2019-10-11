const currencyApi = require('../../src/currencyApi')
const currencies = require('../../src/currencyApi/currencies')

describe('Currency API', () => {
	test(`Should contain ALL the currencies in it's currencies method`, () => {
		expect(currencyApi.currencies).not.toBeFalsy()
		expect(Object.keys(currencyApi.currencies)
			.every((value, index) => value === Object.keys(currencies)[index])
		).toBeTruthy()
	})

	describe('Individual currencies', () => {
		describe('Should have a correct name and a port property', () => {
			for (let currency in currencyApi.currencies) {
				test(`${currency}`, () => {
					/**
					 * Compara se a propriedade 'currency' da currency tem o mesmo
					 * nome do módulo da currency
					 */
					expect(currency).toBe(currencies[currency].name)
	
					expect(currencyApi.currencies[currency].port)
						.toEqual(expect.any(Number))
				})
			}
		})

		describe(`Should have their individual methods accessible`, () => {
			for (let currency in currencyApi.currencies) {
				test(`${currency}`, () => {
					expect(currencyApi.currencies[currency])
						.toMatchObject(currencies[currency])
				})
			}
		})
	})
})
