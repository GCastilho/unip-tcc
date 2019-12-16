import Common from '../index'
import { SendPending, PSent } from '../db/models/pendingTx'
import { UpdtSent } from '../index'
import Transaction from '../db/models/transaction'

export function withdraw_pending(this: Common) {
	/**
	 * Executa os requests de saque pendentes ao se conectar
	 * com o node da currency
	 */
	this._events.on('node_connected', () => _withdraw_pending())

	/**
	 * Atualiza o main server das transações enviadas que estão pendentes
	 */
	this._events.on('connected', async () => {
		const pendingTx = SendPending.find({
			'transaction.txid': { $exists: true }
		}).lean().cursor()

		let tx: PSent
		while ( tx = await pendingTx.next() ) {
			if (!tx.transaction.txid || tx.transaction.status === 'processing')
				continue
			await updateAndSend({
				opid: tx.transaction.opid,
				txid: tx.transaction.txid,
				status: tx.transaction.status,
				timestamp: tx.transaction.timestamp
			})
		}
	})

	/**
	 * Envia uma atualização de transação ao main server e deleta-a do database
	 * em caso de sucesso e dela ter status confirmed
	 * 
	 * @param transaction A atualização da transação que será enviada ao main
	 */
	const informMainAndDelete = async (transaction: UpdtSent): Promise<void> => {
		try {
			await this.module('update_sent_tx', transaction)
		} catch(err) {
			if (err === 'SocketDisconnected') return
			else throw err
		}

		if (transaction.status === 'confirmed')
			await SendPending.deleteOne({ opid: transaction.opid })
	}

	/**
	 * Atualiza uma transação enviada no database e envia-a ao main server; Se
	 * ela estiver confirmada, deleta-a do database
	 * 
	 * @param transaction O objeto da UpdtSended retornado pelo withdraw
	 */
	const updateAndSend = async (transaction: UpdtSent) => {
		try {
			await Transaction.updateOne({
				opid: transaction.opid
			}, {
				$set: {
					txid: transaction.txid
				}
			})

			await SendPending.updateOne({
				opid: transaction.opid
			}, {
				$set: {
					'transaction.txid': transaction.txid,
					'transaction.status': transaction.status,
					'transaction.timestamp': transaction.timestamp,
					'journaling': transaction.status
				}
			})

			await informMainAndDelete(transaction)
		} catch(err) {
			console.error(`Error updating/sending txSend: ${transaction}`, err)
		}
	}

	/**
	 * Ao utilizar o modo batch as transações deverão ser retornadas em um array
	 * para essa função, que chama a updateAndSend para cada item do array
	 * 
	 * @param transactions O array de transações executadas em batch
	 */
	const updateAndSendTxs = (transactions: UpdtSent[]) => {
		transactions.forEach(updateAndSend)
	}

	/**
	 * Varre a SendPending procurando por transações com journaling 'requested',
	 * e as executa, chamando a função de withdraw para cada uma delas
	 * 
	 * @todo Uma maneira de se recuperar de erros
	 */
	const withdraw_loop = async () => {
		const pendingTx = SendPending.find({
			'transaction.txid': { $exists: false },
			'journaling': 'requested'
		}).cursor()
	
		let doc: PSent
		while( doc = await pendingTx.next() ) {
			doc.journaling = 'picked'
			await doc.save()

			let transaction: true|UpdtSent
			try {
				transaction = await this.withdraw(doc, updateAndSendTxs)
			} catch (err) {
				if (err.code === 'NotSent') {
					doc.journaling = 'requested'
					await doc.save()
					console.error('Withdraw: Transaction was not sended', err)
					break
				}
				throw err
			}

			if (transaction === true) {
				doc.journaling = 'batched'
				await doc.save()
				continue
			}
	
			doc.journaling = 'sended'
			await doc.save()
	
			await updateAndSend(transaction)
		}
	}

	/**
	 * Controla as instâncias do withdraw_loop
	 */
	let looping: boolean = false

	/**
	 * Mantém uma única instância da withdraw_loop e não a inicia caso o node
	 * esteja offline
	 */
	const _withdraw_pending = async () => {
		if (looping || !this.nodeOnline) return
		looping = true
		try {
			await withdraw_loop()
		} catch(err) {
			console.error('Error in withdraw_loop', err)
		}
		looping = false
	}

	return _withdraw_pending
}
