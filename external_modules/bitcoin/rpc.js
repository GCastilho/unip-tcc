const Client = require('bitcoin-core')
const Transaction = require('./db/models/transaction')

const wallet = new Client({
	network: 'regtest',
	username: 'exchange',
	password: 'password',
	port: 40000
});

function createAccount() {
	return 	wallet.getNewAddress()
}
function transactionInfo(txid) {
	return 	wallet.getTransaction(txid)
}

module.exports = {
	createAccount,
	transactionInfo,
	updateTransactionRecords
}
