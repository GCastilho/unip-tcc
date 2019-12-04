import Account from '../../common/db/models/account'
import Transaction from '../../common/db/models/transaction'
import unconfirmedTx from '../db/models/unconfirmedTx'
import { Bitcoin } from '../index'
import { Transaction as Tx } from '../../common'
import { ObjectId } from 'bson'

export function processTransaction(this: Bitcoin) {
	const formatTransaction = async (txid): Promise<Tx | void> => {
		/**
		 * Informações da transação pegas da blockchain
		 */
		const txInfo = await this.rpc.transactionInfo(txid)
		
		/**
		 * Verifica se o txid é de uma transação de mineração
		 */
		if (txInfo.generated) return
		
		/** Salva uma nova transação no database */
		try {
			await new Transaction({
				txid,
				info: txInfo
			}).save()

			await new unconfirmedTx({
				txid,
				confirmations: txInfo.confirmations
			}).save()
		} catch(err) {
			/** Ignora erros de 'transação já existe' */
			if (err.code != 11000) {
				console.log('erro ao inserir no mongo')
				throw err
			}
		}

		console.log('txInfo', txInfo)

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

		/**
		 * Pega o amount recebido da transação
		 */
		const amount: Tx['amount'] = received.amount

		const formattedTransaction: Tx = {
			txid: txInfo.txid,
			status: 'pending',
			confirmations: txInfo.confirmations,
			account: address,
			amount,
			timestamp: txInfo.time*1000 // O timestamp do bitcoin é em segundos
		}
	
		return formattedTransaction
	}

	/**
	 * @todo Uma maneira de pegar transacções de quado o servidor estava off
	 * @todo Adicionar um handler de tx cancelada (o txid muda se aumentar o fee)
	 */
	const _processTransaction = async (body: any) => {
		const { txid } = body
		if (!txid) return

		try {
			const transaction: Tx | void = await formatTransaction(txid)
			if (!transaction) return
			console.log('received transaction', transaction)
			// TODO: handle updateExists
			const opid: Tx['opid'] = await this.module('new_transaction', transaction)
			
			await unconfirmedTx.findOneAndUpdate({ txid }, {
				opid: new ObjectId(opid)
			}, {
				upsert: true
			}).catch(err => {
				console.error('Erro ao adicionar tx na unconfirmedTx', err)
			})

			await Transaction.findOneAndUpdate({ txid }, {
				opid: new ObjectId(opid)
			}, {
				upsert: true
			}).catch(err => {
				console.error('Erro ao adicionar tx na transactions', err)
			})
		} catch (err) {
			console.error('Transaction processing error', err)
		}
	}
	
	return _processTransaction
}
