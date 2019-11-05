const Transaction = require('../common/db/models/transaction')
const Account = require('./db/models/account')
const rpc = require('./rpc')
const Axios = require('axios')

/**
 *retorna cronologicamente todas as transaçoes de receive que ocorreram entre block e firstBlock
 */
async function getReceiveHistory(firstBlock,block) {
	
	let receiveArray = []
	let blockNow = block

	//segue a blockchain da nano ate encontrar o bloco dado
	while (blockNow!= firstBlock) {
		blockInfo = await rpc.blockInfo(block)
		if (blockInfo.subtype === 'receive' && blockInfo.confirmed) {
			receiveArray.push(info = {
				account: blockInfo.block_account,
				amount: blockInfo.amount,
				block: block,
				time: blockInfo.local_timestamp
			})
		}
		blockNow = block
		block = blockInfo.contents.previous
	}	
	receiveArray.reverse()
	return receiveArray
}

async function checkOld(account) {

	/**
	 * verifica banco de dados pela account para verificar se a mesma pertence a um usuario
	 */

	const accountDb = {lastBlock,account} = (await Account.findOne({account: account},{_id: 0,}))
	if(!accountDb.account) return
	
	accountInfo = await rpc.accountInfo(account)
	/**
	 * frontier é o utimo bloco recebido na account
	 * ele em raros caso pode nao ter sido confirmado, no entanto isso é verificado em checkOld
	 */
	const block = accountInfo.frontier
	const oldBlock = accountDb.lastBlock ? accountDb.lastBlock : accountInfo.open_block

	return await getReceiveHistory(oldBlock, block)
}

function process(transaction) {

	console.log(transaction)
	Axios.post('http://localhost:8085/new_transaction/nano', transaction).catch(err => console.log(err))

	//verifica se o historico de transaçoes é integro
	checkOld(transaction.account).then((transactionArray) => {
		if(!transactionArray) return
		transactionArray.forEach(receive => {
			new Transaction({
				tx: receive.block,
				info: {account,amount,time} = receive
			}).save().then(() => {
				Axios.post('http://localhost:8085/new_transaction/nano', receive).catch(err => console.log(err))
			}).catch((err) => {
				if(err.code != 11000)
					console.log(err)
			})
		})
		const tx = transactionArray[transactionArray.length - 1]
		
		Account.collection.updateOne({
			account: tx.account
		}, {$set: { lastBlock: tx.block	}
		})
	})
}


module.exports = process
