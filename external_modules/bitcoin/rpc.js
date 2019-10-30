const Client = require('bitcoin-core')
//const Transaction = require('../common/db/models/transaction')

const wallet = new Client({
	network: 'regtest',
	username: 'exchange',
	password: 'password',
	port: 40000
});

const createAccount = () => wallet.getNewAddress()

const transactionInfo = (txid) => wallet.getTransaction(txid)

module.exports = {
	createAccount,
	transactionInfo,
	//updateTransactionRecords
}
