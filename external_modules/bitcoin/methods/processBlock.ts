import PendingTx, { PTx } from '../../common/db/models/pendingTx'
import { Bitcoin } from '../index'
import { TxSend } from '../../common'
import { TxUpdt } from '../../../src/db/models/transaction'

export function processBlock(this: Bitcoin) {
	/**
	 * Verifica a quantidade de confirmações de uma transação e informa o
	 * servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const updateConfirmations = async (tx: PTx): Promise<void> => {
		try {
			const txInfo = await this.rpc.transactionInfo(tx.txid)

			/**
			 * Se não tem a opid é pq o main server não foi informado
			 * dessa transação
			 */
			if (!tx.received.opid) {
				// !opid -> não foi possível enviar a tx ao main
				const opid = await this.sendToMainServer(tx.received)
				if (!opid) return

				tx.received.opid = opid
			}

			/** Atualiza o número de confirmações */
			await PendingTx.updateOne({
				txid: tx.txid
			}, {
				$set: {
					'received.confirmations': txInfo.confirmations
				}
			})

			const status: TxSend['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'
			tx.received.status = status
			await tx.save()

			const txUpdate: TxUpdt = {
				opid: tx.received.opid,
				status,
				confirmations: status === 'confirmed' ? null : txInfo.confirmations
			}

			try {
				await this.module('transaction_update', txUpdate)
			} catch (err) {
				if (err === 'SocketDisconnected') return
				/**
				 * OperationNotFound significa ou que a transação não existe
				 * no main server ou que ela foi concluída (e está inacessível
				 * a um update), em ambos os casos o procedimento é
				 * deletar ela daqui
				 */
				if (err.code != 'OperationNotFound') throw err
			}

			/**
			 * Deleta a transação apenas se conseguir informá-la ao servidor
			 * principal ou se retornado OperationNotFound
			 */
			if (status === 'confirmed') {
				console.log('deleting confirmed transaction', {
					opid: tx.received.opid,
					txid: tx.received.txid,
					status,
					confirmations: txInfo.confirmations
				})
				await PendingTx.deleteOne({ txid: tx.txid })
			}
		} catch (err) {
			console.error('Error updating confirmations', err)
		}
	}

	/**
	 * Processa novos blocos recebidos da blockchain
	 * 
	 * @param body O body enviado pelo curl que o RPC do bitcoin faz
	 */
	const _processBlock = async (body: any) => {
		if (!body.block) return
		try {
			/** Todas as transações não confirmadas no database */
			const transactions: PTx[] = await PendingTx.find()
			if (transactions.length > 0)
				transactions.forEach(tx => updateConfirmations(tx))
		} catch(err) {
			console.error('Error fetching unconfirmed transactions', err)
		}
	}

	return _processBlock
}
