import Account from '../../common/db/models/account'
import Transaction from '../../common/db/models/transaction'
import UnconfirmedTx from '../db/models/unconfirmedTx'
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
export async function formatTransaction(txid: string, getInfo: Function): Promise<Tx | void> {
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
 * Insere um opid na transação com o txid informado na collection Transactions
 * e UnconfirmedTxs
 * 
 * @param txid txid da transação daquele opid
 * @param opid string do opid retornado do main_server
 */
export async function insertOpid(txid: Tx['txid'], opid: Tx['opid']) {
	if (!opid) return

	await UnconfirmedTx.findOneAndUpdate({ txid }, {
		opid: new ObjectId(opid)
	}).catch(err => {
		console.error('Erro ao adicionar opid em uma unconfirmedTx', err)
	})

	await Transaction.findOneAndUpdate({ txid }, {
		opid: new ObjectId(opid)
	}).catch(err => {
		console.error('Erro ao adicionar opid em uma transaction', err)
	})
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
		console.log('received transaction', transaction)

		/** Salva a nova transação no database */
		try {
			await new Transaction({
				txid,
				account: transaction.account
			}).save()
			await new UnconfirmedTx({
				txid,
				confirmations: transaction.confirmations
			}).save()
		} catch (err) {
			/** Para a execução se a transação já existe */
			if (err.core === 11000) return
			console.error('Erro ao adicionar tx na Transactions/UnconfirmedTx')
			throw err
		}

		try {
			const opid: Tx['opid'] = await this.module('new_transaction', transaction)
			await insertOpid(transaction.txid, opid)
		} catch (err) {
			if (err === 'SocketDisconnected') return
			if (err.code === 'TransactionExists') {
				await insertOpid(txid, err.transaction.opid)
			} else if (err.code === 'UserNotFound') {
				// A account não existe no servidor principal
				await UnconfirmedTx.deleteMany({ account: transaction.account })
				await Transaction.deleteMany({ account: transaction.account })
			} else {
				throw err
			}
		}
	} catch (err) {
		console.error('Transaction processing error', err)
	}
}
