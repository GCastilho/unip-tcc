const request = require('supertest')
const common = require('../../../src/currencyApi/common')
const currencies = require('../../../src/currencyApi/currencies')
const functions = require('../../../src/currencyApi/listener/functions')
const app = require('../../../src/currencyApi/listener')
require('../../fixtures/db') /** Conecta ao database */

test('Should allow access to it\'s functions to all currencies', async () => {
	for (let currency in currencies) {
		for (let command in functions) {
			await request(app).get(`/${command}/${currency}`).send()
				.expect(200)
		}
	}
})

test('Should not allow access to a function in the common module', async () => {
	for (let currency in currencies) {
		for (let command in common) {
			await request(app).get(`/${command}/${currency}`).send()
				.expect(400)
		}
	}
})

test('Should not allow access to a function or property on the individual modules', async () => {
	for (let currency in currencies) {
		for (let command in currencies[currency]) {
			await request(app).get(`/${command}/${currency}`).send()
				.expect(400)
		}
	}
})

test('Should return error if a currency does not exist', async () => {
	for (let command in functions) {
		await request(app).get(`/${command}/moeda`).send()
			.expect(400)
	}
})

test('Should return error if a command does not exist', async () => {
	for (let currency in currencies) {
		await request(app).get(`/comando/${currency}`).send()
			.expect(400)
	}
})
