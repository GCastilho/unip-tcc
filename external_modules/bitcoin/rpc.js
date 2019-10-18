const Client = require('bitcoin-core')

const wallet = new Client({
	network: 'regtest',
	username: 'exchange',
	password: 'password',
	port: 40000
});

function createAccount() {
	return 	wallet.getNewAddress()
}

module.exports = {
	createAccount
}
