const Client = require('bitcoin-core')
const Account = require('../common/db/models/account')

const wallet = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	port: 40000
})

async function createAccount() {
	const address = await wallet.getNewAddress()
	await new Account({
		account: address,
		isUpdated: true
	}).save()

	return address
}
const transactionInfo = txid => wallet.getTransaction(txid)

const blockInfo = block => wallet.getBlock(block)

const send = (address, amount) => wallet.SendToAddress(address, amount)

module.exports = {
	createAccount,
	transactionInfo,
	blockInfo,
	send
}
