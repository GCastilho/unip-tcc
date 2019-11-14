import Transaction from '../../_common/db/models/transaction'
import Account from '../../_common/db/models/account'
import { Nano } from '../index'
import { Transaction as ITransaction } from '../../_common'
const Axios = require('axios')

export function processTransaction(this: Nano) {
	/**
	 *retorna cronologicamente todas as transaçoes de receive que ocorreram entre block e firstBlock
	 */
	const getReceiveHistory = async (firstBlock, block) => {
		let receiveArray = []
		let blockNow = block
	
		//segue a blockchain da nano ate encontrar o bloco dado
		while (blockNow!= firstBlock) {
			const blockInfo = await this.rpc.blockInfo(block)
			if (blockInfo.subtype === 'receive' && blockInfo.confirmed) {
				const amount = await this.rpc.convertToNano(blockInfo.amount)
				receiveArray.push({
					account: blockInfo.block_account,
					amount: amount,
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
	
	const checkOld = async (account) => {
		/**
		 * verifica banco de dados pela account para verificar se a mesma pertence a um usuario
		 */
		const accountDb = await Account.findOne({ account: account },{ _id: 0 })
		
		if (!accountDb || !accountDb.account) return
		
		const accountInfo = await this.rpc.accountInfo(account)
		/**
		 * frontier é o utimo bloco recebido na account
		 * ele em raros caso pode nao ter sido confirmado, no entanto isso é verificado em checkOld
		 */
		const block = accountInfo.frontier
		const oldBlock = accountDb.lastBlock ? accountDb.lastBlock : accountInfo.open_block
	
		return await getReceiveHistory(oldBlock, block)
	}
	
	const _processTransaction = (transaction: ITransaction) => {
		console.log(transaction)
		
		// enviar ao main server
		Axios.post(`http://${global.main_server_ip}:${global.main_server_port}/new_transaction/nano`, transaction).catch(err => console.log(err))
		
		//verifica se o historico de transaçoes é integro
		checkOld(transaction.account).then((transactionArray) => {
			if (!transactionArray) return
			transactionArray.forEach(receive => {
				new Transaction({
					tx: receive.txid,
					info: { account, amount, timestamp} = receive
				}).save().then(() => {

					// Pq tá sendo anviado duas vezes???
					Axios.post(`http://${global.main_server_ip}:${global.main_server_port}/new_transaction/nano`,receive).catch(err => console.log(err))

				}).catch((err) => {
					if (err.code != 11000) console.error(err)
				})
			})
			const tx = transactionArray[transactionArray.length - 1]
			
			Account.updateOne({
				account: tx.account
			},{
				$set: {lastBlock: tx.txid}
			})
		}).catch((err) => {
			if (err.error != 'Account not found') console.error(err)
		})
	}

	return _processTransaction
}

