import Transaction from '../../common/db/models/transaction'
import Account from '../../common/db/models/account'
import { Nano } from '../index'
import { TxReceived } from '../../common'
import { fromRawToNano, fromNanoToRaw } from '../utils/unitConverter'

export function processTransaction(this: Nano) {
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
	 * Processa blocos de receive da nano
	 * 
	 * @param block O bloco que acabou de ser recebido
	 * 
	 * @todo Common não receber string, mas any
	 */
	const _processTransaction = async (block: any): Promise<void> => {
		let txArray: TxReceived[]|void
		try {
		/** Procura por transações que não foram computadas */
			//const account=block.message.accountt;
			const savedAccount=await Account.findOne({account : block.message.account});
			if (!savedAccount) return;
			
			txArray=await this.rewindTransactions.findMissingTx(savedAccount.account, savedAccount.lastBlock)
			if (!txArray) return
		} catch(err) {
			return console.error('Error finding missing transactions:', err)
		}

		/**
		 * A transação mais recente deveria estar no txArray, entretanto,
		 * graças a velocidade do sistema, esse código pode rodar
		 * antes da atualização da blockchain ter concluído, por esse
		 * motivo a tx é adicionada manualmente aqui
		 */
		txArray.push({
			txid:      block.message.hash,
			account:   block.message.account,
			status:    'confirmed',
			amount:    fromRawToNano(block.message.amount),
			timestamp: parseInt(block.time)
		})

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

		const lastTx = txArray[txArray.length - 1]
		Account.updateOne({
			account: lastTx.account
		}, {
			$set: {
				lastBlock: lastTx.txid
			}
		}).catch(err => {
			console.error('Error updating lastTx of account:', err)
		})
	}

	return _processTransaction
}
