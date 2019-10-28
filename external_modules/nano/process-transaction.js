const Transaction = require(require.resolve(`./db/models/transaction`,{paths:[`./`,'../common']}))
const Account = require(require.resolve(`./db/models/account`,{paths:[`./`,'../common']}))
const Rpc = require(`./rpc`)
const Axios = require("axios")

function getReceiveHistory(firstBlock,block) {
	let receiveArray = [block]
	let previous = block.contents.previous
	while (receiveArray[receiveArray.length - 1].block != firstBlock) {
		Rpc.blockInfo(previous).then(blockInfo => {
			receiveArray.push(blockInfo)
			previous= blockInfo.contents.previous
		})
	}
}
function checkOld(transaction) {
	return new Promise(function (resolve,reject) {
		Rpc.blockInfo(transaction.block).then(blockInfo => {
			new Transaction({
				tx: transaction.block,
				info: blockInfo
			}).save().catch(err => {
				reject('erro ao salvar transacao no banco de dados')
			})
			Account.findOne({account: transaction.account}).then((req,res) => {
				if (res === null) {
					reject()
				} else {
					if (lastBlock = null) {
						getReceiveHistory('0000000000000000000000000000000000000000000000000000000000000000',blockInfo)
					} else if (lastBlock = blockInfo.contents.previous) {
						Account.collection.updateOne({account: data,},{$set: {lastBlock: lastBlock}},{})
					} else {
						getReceiveHistory(lastBlock,blockInfo)
					}
					let i = 0
					const transactionMeta = []
					resolve(transactionMeta)
				}
			})
		})
	})
}

function process(req) {
	const transaction = {
		account: req.query.account,
		txid: req.query.block,
		amount: req.query.amount,
		time: req.query.time
	}
	Axios.post(`http://localhost:8085/new_transaction/nano`,null,{
		params: {transaction: transaction}
	}).then(res => {
		console.log(res)
	}).catch(err => {console.log(err)})
	//checkOld(transaction).then(res => {console.log(res)})

}


module.exports = {
	process
}