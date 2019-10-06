const Person = require('../../src/db/models/person')
const Cookie = require('../../src/db/models/cookie')

async function cleanDatabase() {
	await Person.deleteMany()
	await Cookie.deleteMany()
}

const users = [
	{
		email: 'user1@example.com',
		password: 'userOneP@ss'
	},
	{
		email: 'user2@example.com',
		password: 'sOmEp@$$'
	}
]

module.exports = {
	cleanDatabase,
	users
}
