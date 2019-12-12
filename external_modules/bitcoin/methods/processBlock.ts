import { ReceivedPending, PReceived, PSended, SendPending } from '../../common/db/models/pendingTx'
import { Bitcoin } from '../index'
import { TxSend, UpdtSended, UpdtReceived } from '../../common'

export function processBlock(this: Bitcoin) {
	/**
	 * Envia uma txUpdt ao main server
	 * @param txUpdate A transação que deve ser informada ao main server
	 * @param type Se a transação é 'receive' ou 'send'
	 */
	const updtMainServer = async (txUpdate: UpdtReceived|UpdtSended, type: 'receive'|'send') => {
		try {
			if (type === 'receive') {
				await this.module('update_received_tx', txUpdate)
			} else {
				await this.module('update_sended_tx', txUpdate)
			}
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
	}

	/**
	 * Verifica a quantidade de confirmações de uma transação recebida e informa
	 * o servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const processReceived = async (doc: PReceived): Promise<void> => {
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

		/** Atualiza o número de confirmações e o status */
		const status: TxSend['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'
		doc.transaction.status = status
		doc.transaction.confirmations = txInfo.confirmations
		await doc.save()

		const txUpdate: UpdtReceived = {
			opid: doc.transaction.opid,
			status,
			confirmations: status === 'confirmed' ? null : txInfo.confirmations
		}

		/** Envia a atualização ao servidor principal */
		await updtMainServer(txUpdate, 'receive')

		/**
		 * Deleta a transação se conseguir informá-la ao main server e se
		 * ela estiver confirmed
		 */
		if (status === 'confirmed') {
			console.log('deleting confirmed received transaction', {
				opid: doc.transaction.opid,
				txid: doc.transaction.txid,
				status,
				confirmations: txInfo.confirmations
			})
			await doc.remove()
		}
	}

	/**
	 * Verifica a quantidade de confirmações de uma transação enviada e informa
	 * o servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const processSended = async (doc: PSended) => {
		if (!doc.transaction.txid) return
		const txInfo = await this.rpc.transactionInfo(doc.transaction.txid)

		/** Atualiza o número de confirmações e o status */
		const status: TxSend['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'
		doc.transaction.status = status
		doc.transaction.confirmations = txInfo.confirmations
		await doc.save()

		const txUpdate: UpdtSended = {
			opid: doc.transaction.opid,
			txid: doc.transaction.txid,
			status,
			timestamp: doc.transaction.timestamp,
			confirmations: status === 'confirmed' ? null : txInfo.confirmations
		}

		/** Envia a atualização ao servidor principal */
		await updtMainServer(txUpdate, 'send')

		/**
		 * Deleta a transação se conseguir informá-la ao main server e se
		 * ela estiver confirmed
		 */
		if (status === 'confirmed') {
			console.log('deleting confirmed sended transaction', {
				opid: doc.transaction.opid,
				txid: doc.transaction.txid,
				status,
				confirmations: txInfo.confirmations
			})
			await doc.remove()
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
			/** Todas as transactions received não confirmadas no database */
			const received: PReceived[] = await ReceivedPending.find()
			if (received.length > 0) {
				received.forEach(tx => processReceived(tx).catch(err => {
					console.error('Error processing received transactions', err)
				}))
			}
			
			/** Todas as transações ENVIADAS e não confirmadas no database */
			const sended: PSended[] = await SendPending.find({
				'transaction.txid': { $exists: true }
			})
			if (sended.length > 0) {
				sended.forEach(tx => processSended(tx).catch(err => {
					console.error('Error processing sended transactions', err)
				}))
			}
		} catch(err) {
			console.error('Error fetching unconfirmed transactions', err)
		}
	}

	return _processBlock
}
