//const Transaction = require(require.resolve(`./db/models/transaction`,{paths:[`./`,'../common']}))
const Account = require('./db/models/account')
const rpc = require(`./rpc`)
const Axios = require("axios")

// Esse while não funciona
function getReceiveHistory(firstBlock, block) {
	const receiveArray = [block]
	let previous = block.contents.previous
	while (receiveArray[receiveArray.length - 1].block != firstBlock) {
		rpc.blockInfo(previous).then(blockInfo => {
			receiveArray.push(blockInfo)
			previous = blockInfo.contents.previous
		})
	}
}

async function checkOld(transaction) {
	const blockInfo = await rpc.blockInfo(transaction.block)

	try {
		await new Transaction({
			tx: transaction.block,
			info: blockInfo
		}).save()
	} catch(err) {
		throw 'erro ao salvar transação no banco de dados'
	}

	const account = await Account.findOne({account: transaction.account})
	if (!account)
		throw 'account does NOT exist in the database'
	
	if (lastBlock === null) {
		getReceiveHistory('0000000000000000000000000000000000000000000000000000000000000000', blockInfo)
	} else if (lastBlock === blockInfo.contents.previous) {
		Account.collection.updateOne({ account: data }, {
			$set: { lastBlock: lastBlock } }
		).exec()
	} else {
		getReceiveHistory(lastBlock, blockInfo)
	}
	let i = 0
	const transactionMeta = []
	return transactionMeta
}

function process(req) {
	const transaction = {
		account: req.query.account,
		txid: req.query.block,
		amount: req.query.amount,
		time: req.query.time
	}
	Axios.post(`http://localhost:8085/new_transaction/nano`, transaction)
	.then(res => {
		console.log(res)
	}).catch(err => console.log(err))
	//checkOld(transaction).then(res => {console.log(res)})
}


module.exports = {
	process
}
