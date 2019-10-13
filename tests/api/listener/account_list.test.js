const request = require('supertest')
const currencyApi = require('../../../src/currencyApi')
const Person = require('../../../src/db/models/person')
const app = require('../../../src/currencyApi/listener')
const { setupUsers } = require('../../fixtures/db')

beforeAll(setupUsers)

describe('Should return a list of accounts for each currency', () => {
	for (let currency in currencyApi.currencies) {
		test(`${currency}`, async () => {
			const res = await request(app).get(`/account_list/${currency}`)
				.send()
				.expect(200)
			
			const received_accounts = res.text.split('\n').filter(v => v)

			let stored_accounts = []
			await Person.find().then(people => {
				people.forEach(person => {
						stored_accounts.push(...person.currencies[currency])
					}
				)
			})
			expect(stored_accounts.length).toEqual(received_accounts.length)
			expect(stored_accounts)
				.toEqual(expect.arrayContaining(received_accounts))
		})
	}
})
