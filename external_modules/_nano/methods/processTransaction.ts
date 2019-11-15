import Transaction from '../../_common/db/models/transaction'
import Account from '../../_common/db/models/account'
import { Nano } from '../index'
import { Transaction as ITransaction } from '../../_common'

export function processTransaction(this: Nano) {
	/**
	 *retorna cronologicamente todas as transaçoes de receive que ocorreram entre block e firstBlock
	 */
	const getReceiveHistory = async (firstBlock, block) => {
		let receiveArray: any = []
		let blockNow = block
	
		//segue a blockchain da nano até encontrar o bloco dado
		while (blockNow != firstBlock) {
			const blockInfo: any = await this.rpc.blockInfo(block)
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
		return receiveArray.reverse()
	}
	
	const checkOld = async (account) => {
		/**
		 * verifica banco de dados pela account para verificar se a mesma pertence a um usuario
		 */
		const accountDb = await Account.findOne({ account }, { _id: 0 })
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
	
	const _processTransaction = async (transaction: ITransaction): Promise<void> => {
		console.log(transaction)
		
		// envia ao main server
		await this.module('new_transaction', transaction)
		
		//verifica se o historico de transaçoes é integro
		checkOld(transaction.account).then((transactionArray) => {
			if (!transactionArray) return
			transactionArray.forEach(async received => {
				const { account, amount, timestamp} = received
				try {
					await new Transaction({
						tx: received.txid,
						info: { account, amount, timestamp }
					}).save()
				} catch (err) {
					if (err.code != 11000) console.error(err)
				}
				await this.module('new_transaction', received)
			})
			const tx = transactionArray[transactionArray.length - 1]
			
			Account.updateOne({
				account: tx.account
			},{
				$set: { lastBlock: tx.txid }
			}).exec()
		}).catch((err) => {
			if (err.error != 'Account not found') console.error(err)
		})
	}

	return _processTransaction
}

