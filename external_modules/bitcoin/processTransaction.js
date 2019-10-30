const Account = require(`../common/db/models/account`)
const Transaction = require("../common/db/models/transaction.js")
const Rpc = require(`./rpc`)
const Axios = require("axios")
let lasTtransactionId = ''


async function formatTransaction(txid) {
	// Pega informações da transaction da blockchain
	const transaction = await Rpc.transactionInfo(txid)
	if (transaction.generated) throw 'not a transaction'

	// Salva no database e da throw se a transação já existe
	await new Transaction({
		tx: txid,
		info: transaction
	}).save()

	const formattedTransaction = {}
	transaction.details = transaction.details.filter(details =>
		details.category === 'receive'
	)
	formattedTransaction.account = transaction.details[0].address

	// Verifica se a transaçãoa é nossa
	const account = await Account.findOne({ account: formattedTransaction.account })
	if (!account)
		throw 'account does NOT exist in the database'
	
	formattedTransaction.txid       = transaction.txid
	formattedTransaction.ammount    = transaction.details[0].amount
	formattedTransaction.blockindex = transaction.blockindex
	formattedTransaction.time       = transaction.time

	return formattedTransaction
}

module.exports = function process(body) {
	const { txid } = body
	//por algum motivo a cada transacao estava sendo recebido 2x a transçao e um undefined
	if (!txid || lasTtransactionId === txid) return
	lasTtransactionId = txid

	formatTransaction(txid)
	.then(transaction => {
		Axios.post(`http://localhost:8085/new_transaction/bitcoin`, transaction)
	}).catch(err => {
		console.error('transaction processing error', err)
	})
}
