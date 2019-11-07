const Account = require('../common/db/models/account')
const unconfirmedTx = require('./db/models/unconfirmed-tx')
const Transaction = require('../common/db/models/transaction')
const Rpc = require('./rpc')
const Axios = require('axios')
let lasTtransactionId = ''

function getConfirmed(txid) {
	Rpc.transactionInfo(txid).then(transaction => {
		if (transaction.confirmations >= 6) {
			console.log({txid: txid,confirmed: true,confirmations: transaction.confirmations})
			unconfirmedTx.deleteOne({ tx: txid }).exec()
			Axios.post(`http://${global.main_server_ip}:${global.main_server_port}/new_transaction/bitcoin`, {txid: txid,confirmed: true})
		}
	}).catch(err => {console.log('rpc error,'+err)})
}


async function formatTransaction(txid) {
	// Pega informações da transaction da blockchain
	const transaction = await Rpc.transactionInfo(txid)
	if (transaction.generated) throw 'not a transaction'

	// Salva no database e da throw se a transação já existe
	await new Transaction({
		tx: txid,
		info: transaction
	}).save().catch((err) => {
		if (err.code != 11000)
			console.error(err)
	})

	await new unconfirmedTx({
		tx: txid,
		confirmations: transaction.confirmations
	}).save().catch((err) => {
		if (err.code != 11000)
			console.error(err)
	})


	const formattedTransaction = {}

	transaction.details = transaction.details.filter(details =>
		details.category === 'receive'
	)	
	formattedTransaction.account = transaction.details[0].address
	formattedTransaction.txid       = transaction.txid
	formattedTransaction.amount     = transaction.details[0].amount
	//formattedTransaction.blockindex = transaction.blockindex
	formattedTransaction.timestamp  = transaction.time*1000

	return formattedTransaction
}
function process(body) {
	const { txid } = body
	const { block } = body
	
	if (block) {
		//pega todas as transaçoes que ficaram a mais do que 5 blocos no database
		unconfirmedTx.find({blockCount: {$gte: 6}},{_id: 0,tx: 1}).then(res => {
			if (res.length > 0)
				res.forEach((tx) => {getConfirmed(tx.tx)})
			//incrementa o contador de blocos da transacao no
			unconfirmedTx.collection.updateMany({},{$inc: {blockCount: 1}},{})
		}).catch(() => {console.error('block processing error')})
	} else {
		//por algum motivo a cada transacao estava sendo recebido 2x a transçao e um undefined
		if (!txid || lasTtransactionId === txid) return
		lasTtransactionId = txid

		formatTransaction(txid).then(transaction => {
			Account.findOne({account: transaction.account}).then(account => {
				if (!account) throw 'account does NOT exist in the database'
					.then(transaction => {
						Axios.post(`http://${global.main_server_ip}:${global.main_server_port}/new_transaction/bitcoin`,transaction)
					}).catch(err => {
						if (err.cod != 0)
							console.error('transaction processing error',err)
					})
			})
		})
	}
}

module.exports = {
	process,
	formatTransaction
}
