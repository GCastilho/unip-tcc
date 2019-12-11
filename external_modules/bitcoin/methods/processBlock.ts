import { ReceivedPending, PReceived } from '../../common/db/models/pendingTx'
import { Bitcoin } from '../index'
import { TxSend } from '../../common'
import { UpdtReceived } from '../../../src/db/models/transaction'

export function processBlock(this: Bitcoin) {
	/**
	 * Verifica a quantidade de confirmações de uma transação e informa o
	 * servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const updateConfirmations = async (doc: PReceived): Promise<void> => {
		try {
			const txInfo = await this.rpc.transactionInfo(doc.txid)

			/**
			 * Se não tem a opid é pq o main server não foi informado
			 * dessa transação
			 */
			if (!doc.transaction.opid) {
				// !opid -> não foi possível enviar a tx ao main
				const opid = await this.sendToMainServer(doc.transaction)
				if (!opid) return

				doc.transaction.opid = opid
			}

			/** Atualiza o número de confirmações */
			await ReceivedPending.updateOne({
				txid: doc.txid
			}, {
				$set: {
					'transaction.confirmations': txInfo.confirmations
				}
			})

			const status: TxSend['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'
			doc.transaction.status = status
			await doc.save()

			const txUpdate: UpdtReceived = {
				opid: doc.transaction.opid,
				status,
				confirmations: status === 'confirmed' ? null : txInfo.confirmations
			}

			try {
				await this.module('update_received_tx', txUpdate)
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
					opid: doc.transaction.opid,
					txid: doc.transaction.txid,
					status,
					confirmations: txInfo.confirmations
				})
				await ReceivedPending.deleteOne({ txid: doc.txid })
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
			const transactions: PReceived[] = await ReceivedPending.find()
			if (transactions.length > 0)
				transactions.forEach(tx => updateConfirmations(tx))
		} catch(err) {
			console.error('Error fetching unconfirmed transactions', err)
		}
	}

	return _processBlock
}
