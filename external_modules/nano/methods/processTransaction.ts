import Transaction from '../../common/db/models/transaction'
import Account from '../../common/db/models/account'
import { Nano } from '../index'
import { TxReceived } from '../../common'

export function processTransaction(this: Nano) {
	const redirectToStd = async (transaction: TxReceived): Promise<void> => {
		/** Não redireciona para a stdAccount transações recebidas na stdAccount */
		if (transaction.account === this.stdAccount) return

		await this.rpc.command({
			action: 'send',
			wallet: this.wallet,
			source: transaction.account,
			destination: this.stdAccount,
			amount: transaction.amount
		}).catch(err => {
			console.error('Error redirecting to nano stdAccount', err)
		})
	}

	/**
	 * Procura por transações não computadas até a última transação salva no db
	 * e as retorna em um array de Tx
	 * 
	 * @param account A account para checar o histórico de transações
	 */
	const findMissingTx = async (account: string): Promise<TxReceived[] | undefined> => {
		/** Verifica se a account pertence a um usuário */
		const savedAccount = await Account.findOne({ account })
		if (!savedAccount) return
		
		const accountInfo = await this.rpc.accountInfo(account)
		const lastKnownBlock = savedAccount.lastBlock ? savedAccount.lastBlock : accountInfo.open_block

		const receiveArray: TxReceived[] = []
		let blockHash = accountInfo.frontier
	
		/** Segue a blockchain da nano até encontrar o lastKnownBlock */
		while (blockHash != lastKnownBlock) {
			const blockInfo = await this.rpc.blockInfo(blockHash)
			// pega apenas blocos de received q foram confirmados
			if (blockInfo.subtype === 'receive' && blockInfo.confirmed === 'true' ) {
				receiveArray.push({
					txid: blockHash,
					type: 'receive',
					account: blockInfo.block_account,
					status: 'confirmed',
					amount: await this.rpc.convertToNano(blockInfo.amount),
					timestamp: parseInt(blockInfo.local_timestamp)
				})
			}
			blockHash = blockInfo.contents.previous
		}
		return receiveArray.reverse()
	}

	/**
	 * Processa blocos de receive da nano
	 * 
	 * @param block O bloco que acabou de ser recebido
	 * 
	 * @todo Common não receber string, mas any
	 */
	const _processTransaction = async (block: any): Promise<void> => {
		try {
			/** Procura por transações que não foram computadas */
			const txArray = await findMissingTx(block.message.account)
			if (!txArray) return

			console.log({ txArray }) // remove

			/**
			 * A transação mais recente deveria estar no txArray, entretanto,
			 * graças a velocidade do nosso sistema, esse código pode rodar
			 * antes da atualização da blockchain ter concluido, por esse
			 * motivo a tx é adicionada manualmente aqui
			 */
			txArray.push({
				txid: block.message.hash,
				type: 'receive',
				account: block.message.account,
				status: 'confirmed',
				amount: await this.rpc.convertToNano(block.message.amount),
				timestamp: parseInt(block.time),
			})

			txArray.forEach(transaction => {
				/**
				 * Uma transação duplicada irá disparar o erro 11000 do mongo,
				 * por consequência ela não será transmitida mais de uma vez
				 * ao main server
				 */
				new Transaction({
					txid: transaction.txid,
					type: 'receive',
					account: transaction.account
				}).save().then(() => {
					return this.sendToMainServer(transaction)
				}).then(() => {
					return redirectToStd(transaction)
				}).catch(err => {
					if (err.code != 11000) console.error(err)
				})
			})

			const lastTx = txArray[txArray.length - 1]
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
