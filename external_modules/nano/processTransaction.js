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
				txid: block,
				timestamp: blockInfo.local_timestamp
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
	
	if (!accountDb || !accountDb.account) return
	
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
	Axios.post(`http://${global.main_server_ip}:${global.main_server_port}/new_transaction/nano`, transaction).catch(err => console.log(err))
	//verifica se o historico de transaçoes é integro
	checkOld(transaction.account).then((transactionArray) => {
		if (!transactionArray) return
		transactionArray.forEach(receive => {
			new Transaction({
				tx: receive.txid,
				info: {account,amount,timestamp} = receive
			}).save().then(() => {
				Axios.post(`http://${global.main_server_ip}:${global.main_server_port}/new_transaction/nano`,receive).catch(err => console.log(err))
			}).catch((err) => {
				if (err.code != 11000)
					console.log(err)
			})
		})
		const tx = transactionArray[transactionArray.length - 1]
		
		Account.collection.updateOne({
			account: tx.account
		},{
			$set: {lastBlock: tx.txid}
		})
	}).catch((err) => {
		if (err.error != 'Account not found')
			console.log(err)
	})
}


module.exports = process
