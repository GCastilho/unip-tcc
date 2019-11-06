const Client = require('bitcoin-core')
const Account = require('../common/db/models/account')

const wallet = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	port: 40000
})



function createAccount() {
	return new Promise((resolve, reject) => {
		wallet.getNewAddress().then(address => {
			new Account({
				account: address,
				isUpdated: true
			}).save().then(() => { resolve(address) }).catch(err => {
				reject(err)
			})
		})
	})
}
createAccount().then((res) => {
	console.log(res)
})
const transactionInfo = (txid) => wallet.getTransaction(txid)

const blockInfo = (block) => wallet.getBlock(block)

const send = (address, amount) => wallet.SendToAddress(address, amount)

module.exports = {
	createAccount,
	transactionInfo,
	blockInfo,
	send
}