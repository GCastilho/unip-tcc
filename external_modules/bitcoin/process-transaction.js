const Account = require(`../common/db/models/account`)
const Transaction = require("../common/db/models/transaction.js")
const Rpc = require(`./rpc`)
const Axios = require("axios")
let lasTtransactionId = ""


function formatTransaction(txid) {

	return new Promise(function (resolve,reject) {
		Rpc.transactionInfo(txid).then(transaction => {
			if (transaction.generated) {
				reject('not a transaction')
			} else {
				new Transaction({
					tx: txid,
					info: transaction
				}).save().catch(err => {
					reject(`database error : ${err}`)
				})
				const transactionMeta = {}
				let i = 1
				transactionMeta.account =
					(transaction.details[i].category === 'receive') ? transaction.details[i].address :
					((transaction.details[i = 0].category === "receive") ? transaction.details[i].address : null)
				Account.findOne({account: transactionMeta.account}).then((err,res) => {
					if (res === null) {
						reject('account does NOT exist in the database')
					} else {
						transactionMeta.txid = transaction.txid
						transactionMeta.ammount = transaction.details[i].amount
						transactionMeta.blockindex = transaction.blockindex
						transactionMeta.time = transaction.time
						resolve(transactionMeta)
					}
				})
			}
		}).catch(err => {
			reject(`rpc error: ${err}`)
		})
	})
}

function process(data) {
	txid = data.body.tx	
	//por algum motivo a cada transacao estava sendo recebido 2x a transçao e um undefined
	if (txid != undefined && lasTtransactionId != txid) {
		lasTtransactionId = txid
		formatTransaction(txid).then(transaction => {
			Axios.post(`http://localhost:8085/new_transaction/bitcoin`,null,{
				params: {transaction: transaction}
			})
		}).catch(reason => {
			console.log('transaction processing error')
			console.log(reason)
		})
	}
}


module.exports = {
	process
}