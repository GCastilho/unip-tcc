const Client = require('bitcoin-core')

const wallet = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	port: 40000
})



const createAccount = () => wallet.getNewAddress()

const transactionInfo = (txid) => wallet.getTransaction(txid)

const blockInfo = (block) => wallet.getBlock(block)

const send = (address,amount) => wallet.SendToAddress(address,amount)


module.exports = {
	createAccount,
	transactionInfo,
	blockInfo,
	send
}