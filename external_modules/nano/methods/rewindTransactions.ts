import Account from '../../common/db/models/account'
import Transaction from '../../common/db/models/transaction'
import { TxReceived } from '../../common'
import { Nano } from '../index'
import { fromRawToNano,fromNanoToRaw } from '../utils/unitConverter'



export function rewindTransactions(this: Nano) {
	const redirectToStd = async (transaction: TxReceived): Promise<void> => {
		/** Não redireciona para a stdAccount transações recebidas na stdAccount */
		if (transaction.account === this.stdAccount) return

		await this.rpc.request({
			action: 'send',
			wallet: this.wallet,
			source: transaction.account,
			destination: this.stdAccount,
			amount: fromNanoToRaw(transaction.amount.toString())
		}).catch(err => {
			console.error('Error redirecting to nano stdAccount', err)
		})
	}
	/**
	 * Procura por transações não computadas até a última transação salva no db
	 * e as retorna em um array de Tx
	 * 
	 * @param account A account para checar o histórico de transações
	 * @param lastBlock o utimo bloco recebido na account, armazenado no database
	 */
	const rewindTx= async (account: string, lastBlock:String): Promise<TxReceived[]|undefined> => {
			
		const accountInfo=await this.rpc.accountInfo(account);
		const lastKnownBlock=lastBlock? lastBlock:accountInfo.open_block;

		const receiveArray: TxReceived[]=[];
		let blockHash=accountInfo.frontier;

		/** Segue a blockchain da nano até encontrar o lastKnownBlock */
		while (blockHash!=lastKnownBlock) {
			const blockInfo=await this.rpc.blockInfo(blockHash);
			// pega apenas blocos de received q foram confirmados
			if (blockInfo.subtype==='receive'&&blockInfo.confirmed==='true') {
				receiveArray.push({
					txid: blockHash,
					account: blockInfo.block_account,
					status: 'confirmed',
					amount: fromRawToNano(blockInfo.amount),
					timestamp: parseInt(blockInfo.local_timestamp)
				});
			}
			blockHash=blockInfo.contents.previous;
		}
		return receiveArray.reverse();
	}
	/**
	 * procura pelas transaçoes nao computadas baseado na accont
	 * 
	 * @param account A account para checar o histórico de transações
	 */
	const findMissingTx=async (account: string): Promise<TxReceived[]|undefined> => {
		/** Verifica se a account pertence a um usuário */
		const savedAccount=await Account.findOne({account});
		if (!savedAccount) return;
		return rewindTx( savedAccount.account, savedAccount.lastBlock )
	}

	const findAllMissingTx=async () => {

		Account.find({}).cursor().
			on('data',async (account) => {
				let txArray: TxReceived[]|void
				try {
					/** Procura por transações que não foram computadas */
					txArray=await rewindTx(account.account, account.lastBlock);
					if (!txArray) return;
				} catch (err) {
					return console.error('Error finding missing transactions:', err);
				}
				for (const transaction of txArray) {
					try {
						/**
						 * Uma transação duplicada irá disparar o erro 11000 do mongo,
						 * por consequência ela não será transmitida mais de uma vez
						 * ao main server
						 */
						await new Transaction({
							txid: transaction.txid,
							type: 'receive',
							account: transaction.account
						}).save()
						await this.informMain.newTransaction(transaction)
						await redirectToStd(transaction)
					} catch(err) {
						if (err.code != 11000)
							return console.error('Error processing txArray:', err)
					}
				}
			}).
 			on('end', function() { console.log('Todas as Acconts foram verificadas por transaçoes faltando'); });
	}
	
	return {
		findMissingTx,
		findAllMissingTx
	}
}