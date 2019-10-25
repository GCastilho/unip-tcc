const Transaction = require('./db/models/transaction')
const account = require('./db/models/account')
const Rpc = require(`./rpc`)


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
					console.log(err)
				})
				const transactionMeta = {}
				let i = 1
				transactionMeta.address =
					(tx.details[i].category === "receive") ? tx.details[i].address :
						((tx.details[i = 0].category === "receive") ? tx.details[i].address : null)
				account.findOne({account: transactionMeta.address}).then((account) => {
					if (account === null) {
						reject('not a receive transaction')
					} else {
						transactionMeta.txid = tx.txid
						transactionMeta.ammount = tx.details[i].amount
						transactionMeta.blockindex = tx.blockindex
						resolve(transactionMeta)
					}
				})
			}
		})
	})
}

function process(txid) {
	formatTransaction(txid).then(transactionMeta => {
		return transactionMeta
	})
}


module.exports = {
	process
}