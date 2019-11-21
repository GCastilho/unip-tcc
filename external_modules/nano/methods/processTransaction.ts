import Transaction from '../../common/db/models/transaction'
import Account from '../../common/db/models/account'
import { Nano } from '../index'
import { Transaction as ITransaction } from '../../common'

export function processTransaction(this: Nano) {
	/**
	 * Retorna cronologicamente todas as transaçoes de receive que ocorreram
	 * entre block e lastKnownBlock
	 * 
	 * @param lastKnownBlock Último block salvo no database
	 * @param block Último bloco recebido
	 */
	const getReceiveHistory = async (lastKnownBlock, block, wsBlock): Promise<[any]> => {
		let receiveArray: any=[{
			txid: wsBlock.message.hash,
			account: wsBlock.message.account,
			amount: parseInt(await this.rpc.convertToNano(wsBlock.message.amount)),
			timestamp: wsBlock.time,
		}]
		
	
		/** Segue a blockchain da nano até encontrar o firstBlock */
		while (block != lastKnownBlock) {
			const blockInfo: any = await this.rpc.blockInfo(block)
			if (blockInfo.subtype === 'receive' && blockInfo.confirmed === 'true' ) {
				receiveArray.push({
					account: blockInfo.block_account,
					amount: parseInt(await this.rpc.convertToNano(blockInfo.amount)),
					txid: block,
					timestamp: blockInfo.local_timestamp
				})
			}
			block = blockInfo.contents.previous
		}
		return receiveArray.reverse()
	}
	
	const checkTransactionsIntegrity = async (wsBlock): Promise<any> => {
		const account = wsBlock.message.account
		/**
		 * verifica banco de dados pela account para verificar se a mesma pertence a um usuario
		 */
		const savedAccount = await Account.findOne({ account })
		if (!savedAccount) return
		
		const accountInfo = await this.rpc.accountInfo(account)
		const lastKnownBlock = savedAccount.lastBlock ? savedAccount.lastBlock : accountInfo.open_block
	
		/**
		 * frontier é o utimo bloco recebido na account
		 * ele em raros caso pode nao ter sido confirmado, no entanto isso é
		 * verificado em getReceiveHistory
		 */
		return await getReceiveHistory(lastKnownBlock, accountInfo.frontier, wsBlock)
	}
	
	const redirectToStd = async (transaction: ITransaction): Promise<void> => {
		/** Ignora transações recebidas na stdAccount */
		if (transaction.account === this.stdAccount) return

		this.rpc.command({
			action: 'send',
			wallet: this.wallet,
			source: transaction.account,
			destination: this.stdAccount,
			amount: transaction.amount
		}).catch(err => {
			console.error('Error redirecting to nano stdAccount', err)
		})
	}
	
	const sendToMainServer = async (transaction: ITransaction): Promise<void> => {
		await this.module('new_transaction', transaction)
		await redirectToStd(transaction)
	}

	/**
	 * Processa blocos de receive da nano
	 * 
	 * @param block O bloco que acabou de ser recebido
	 */
	const _processTransaction = async (block: any): Promise<void> => {
		/** Verifica se o historico de transações é integro */
		try {
			const transactionArray = await checkTransactionsIntegrity(block)
			console.log({transactionArray})
			if (transactionArray.length === 0) return
			transactionArray.forEach(async (transaction: any) => {
				const { account, amount, timestamp} = transaction
				new Transaction({
					txid: transaction.txid,
					info: { account, amount, timestamp }
				}).save().then(() => {
					sendToMainServer(transaction)
				}).catch(err => {
					if (err.code != 11000) console.error(err)
				})
			})
			const tx: any = transactionArray[transactionArray.length - 1]
			
			await Account.updateOne({
				account: tx.account
			}, {
				$set: {
					lastBlock: tx.txid
				}
			})
		} catch (err) {
			console.error(err)
		}
	}

	return _processTransaction
}
