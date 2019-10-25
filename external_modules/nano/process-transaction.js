const Transaction = require('./db/models/transaction')
const account = require('./db/models/account')
const Rpc = require(`./rpc`)

function formatTransaction(blockHash) {
	return new Promise(function (resolve,reject) {
		Rpc.blockInfo(blockHash).then(transaction => {
			new Transaction({
				tx: blockHash,
				info: transaction
			}).save().catch(err => {
				reject(err)
			})



			let i = 0
			const transactionMeta = []
			for (i;
			transactionMeta.txid = tx.txid
			transactionMeta.address =
				(tx.details[i].category === "receive") ? tx.details[i].address :
					((tx.details[i = 0].category === "receive") ? tx.details[i].address : null)
			transactionMeta.ammount = tx.details[i].amount
			transactionMeta.blockindex = tx.blockindex
			resolve(transactionMeta)
		})
	})
}

function process(txid) {
	formatTransaction.then((transactionMeta) => {
		return transactionMeta
	})
}


module.exports = {
	process
}