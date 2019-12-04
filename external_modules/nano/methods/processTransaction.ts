import Transaction from '../../common/db/models/transaction'
import Account from '../../common/db/models/account'
import { Nano } from '../index'
import { Transaction as Tx } from '../../common'
import { ObjectId } from 'bson'

export function processTransaction(this: Nano) {
	/**
	 * Retorna cronologicamente todas as transaçoes de receive que ocorreram
	 * entre block e lastKnownBlock
	 * 
	 * @param lastKnownBlock Último block salvo no database
	 * @param block Último bloco recebido
	 * @param wsBlock Bloco recebido pelo webSocket
	 */
	const getReceiveHistory = async (lastKnownBlock, block, wsBlock): Promise<Tx[]> => {
		const receiveArray: Tx[] = [{
			txid: wsBlock.message.hash,
			status: 'confirmed',
			account: wsBlock.message.account,
			amount: parseFloat(await this.rpc.convertToNano(wsBlock.message.amount)),
			timestamp: parseInt(wsBlock.time),
		}]
	
		/** Segue a blockchain da nano até encontrar o firstBlock */
		while (block != lastKnownBlock) {
			const blockInfo: any = await this.rpc.blockInfo(block)
			if (blockInfo.subtype === 'receive' && blockInfo.confirmed === 'true' ) {
				receiveArray.push({
					txid: block,
					account: blockInfo.block_account,
					status: 'confirmed',
					amount: parseFloat(await this.rpc.convertToNano(blockInfo.amount)),
					timestamp: parseInt(blockInfo.local_timestamp)
				})
			}
			block = blockInfo.contents.previous
		}
		return receiveArray.reverse()
	}
	
	const checkTransactionsIntegrity = async (wsBlock): Promise<Tx[] | undefined> => {
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
	
	const redirectToStd = async (transaction: Tx): Promise<void> => {
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
	
	const sendToMainServer = async (transaction: Tx): Promise<void> => {
		const opid: Tx['opid'] = await this.module('new_transaction', transaction)
		
		/** Adiciona o opid à transaction no db local */
		await Transaction.findOneAndUpdate({ txid: transaction.txid }, {
			opid: new ObjectId(opid)
		}).catch(err => {
			console.error('Erro ao adicionar opid à Transaction', err)
		})
		
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
			console.log({transactionArray}) // remove
			if (!transactionArray) return
			transactionArray.forEach(async (transaction: Tx) => {
				const { account, amount, timestamp} = transaction
				new Transaction({
					txid: transaction.txid,
					info: { account, amount, timestamp }
				}).save().then(() => {
					return sendToMainServer(transaction)
				}).catch(err => {
					if (err.code != 11000) console.error(err)
				})
			})
			const lastTx = transactionArray[transactionArray.length - 1]
			
			await Account.updateOne({
				account: lastTx.account
			}, {
				$set: {
					lastBlock: lastTx.txid
				}
			})
		} catch (err) {
			console.error(err)
		}
	}

	return _processTransaction
}
