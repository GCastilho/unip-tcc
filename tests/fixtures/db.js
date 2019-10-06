const Person = require('../../src/db/models/person')
const Cookie = require('../../src/db/models/cookie')

async function cleanDatabase() {
	await Person.deleteMany()
	await Cookie.deleteMany()
}

const user = {
	email: 'user1@example.com',
	password: 'userOneP@ss'
}

module.exports = {
	cleanDatabase,
	user
}
