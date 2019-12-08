import Account from '../../common/db/models/account'
import Transaction from '../../common/db/models/transaction'
import PendingTx from '../../common/db/models/pendingTx'
import { Bitcoin } from '../index'
import { Transaction as Tx } from '../../common'
import { ObjectId } from 'bson'

/**
 * Recebe um txid e uma função para pegar informações brutas dessa transação de
 * blockchain, retorna uma transação formatada usando a interface Tx ou void
 * 
 * @param txid A txid da transação
 * @param getInfo Uma função que recebe um txid e retorna informações brutas da
 * transação da blockchain
 */
export async function formatTransaction(txid: string, getInfo: Function): Promise<Tx|void> {
	/**
	 * Informações da transação pegas da blockchain
	 */
	const txInfo = await getInfo(txid)
	
	/**
	 * Verifica se o txid é de uma transação de mineração
	 */
	if (txInfo.generated) return

	/**
	 * Verifica se é uma transação recebida
	 */
	const received = txInfo.details.find(details =>
		details.category === 'receive'
	)
	if(!received) return
	
	const address: Tx['account'] = received.address
	
	/** Verifica se a transação é nossa */
	const account = await Account.findOne({ account: address })
	if (!account) return

	const formattedTransaction: Tx = {
		txid: txInfo.txid,
		status: 'pending',
		confirmations: txInfo.confirmations,
		account: address,
		amount: received.amount,
		timestamp: txInfo.time*1000 // O timestamp do bitcoin é em segundos
	}

	return formattedTransaction
}

/**
 * @todo Uma maneira de pegar transacções de quado o servidor estava off
 * @todo Adicionar um handler de tx cancelada (o txid muda se aumentar o fee)
 */
export async function processTransaction(this: Bitcoin, txid: Tx['txid']) {
	if (typeof txid != 'string') return

	try {
		const transaction = await formatTransaction(txid, this.rpc.transactionInfo)
		if (!transaction) return
		console.log('received transaction', transaction) //remove

		/** Salva a nova transação no database */
		await new Transaction({
			txid,
			account: transaction.account
		}).save()

		/** Salva a nova transação na collection de Tx pendente */
		await new PendingTx({
			txid,
			transaction
		}).save()

		/**
		 * opid vai ser undefined caso a transação não tenha sido enviada ao
		 * main, nesse caso não há mais nada o que fazer aqui
		 */
		const opid = await this.sendToMainServer(transaction)
		if (!opid) return

		await PendingTx.updateOne({
			txid
		}, {
			$set: {
				'transaction.opid': new ObjectId(opid)
			}
		})
	} catch (err) {
		/**
		 * O evento de transação recebida acontece quando a transação é
		 * recebida e quando ela recebe a primeira confimação, o que causa um
		 * erro 11000
		 */
		if (err.code != 11000)
			console.error('Transaction processing error:', err)
	}
}
