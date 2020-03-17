import { ReceivedPending, PReceived, PSent, SendPending } from '../../common/db/models/pendingTx'
import { Bitcoin } from '../index'
import { UpdtSent, UpdtReceived } from '../../common'

export function processBlock(this: Bitcoin) {
	/**
	 * Verifica a quantidade de confirmações de uma transação recebida e informa
	 * o servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const processReceived = async (doc: PReceived): Promise<void> => {
		const txInfo = await this.rpc.transactionInfo(doc.txid)

		/** Atualiza o número de confirmações e o status */
		const status: UpdtSent['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'
		doc.transaction.status = status
		doc.transaction.confirmations = txInfo.confirmations
		await doc.save()

		/**
		 * Se não tem a opid é pq o main server não foi informado
		 * dessa transação
		 */
		if (!doc.transaction.opid) {
			const opid = await this.informMain.newTransaction(doc.transaction)
			if (!opid) return

			doc.transaction.opid = opid
			await doc.save()
		}

		const txUpdate: UpdtReceived = {
			opid: doc.transaction.opid,
			status,
			confirmations: status === 'confirmed' ? null : txInfo.confirmations
		}

		await this.informMain.updateReceivedTx(txUpdate)
	}

	/**
	 * Verifica a quantidade de confirmações de uma transação enviada e informa
	 * o servidor principal
	 * 
	 * Se uma transação foi confirmada, remove-a da collection da transações
	 * não confirmadas
	 */
	const processSended = async (doc: PSent) => {
		if (!doc.transaction.txid || !doc.transaction.timestamp) return
		const txInfo = await this.rpc.transactionInfo(doc.transaction.txid)

		/** Atualiza o número de confirmações e o status */
		const status: UpdtSent['status'] = txInfo.confirmations >= 6 ? 'confirmed' : 'pending'
		doc.transaction.status = status
		doc.transaction.confirmations = txInfo.confirmations
		await doc.save()

		const txUpdate: UpdtSent = {
			opid: doc.transaction.opid,
			txid: doc.transaction.txid,
			status,
			timestamp: doc.transaction.timestamp,
			confirmations: status === 'confirmed' ? null : txInfo.confirmations
		}

		await this.informMain.updateWithdraw(txUpdate)
	}

	/**
	 * Processa novos blocos recebidos da blockchain
	 * 
	 * @param block O hash do bloco enviado pelo curl
	 */
	const _processBlock = async (block: string) => {
		if (typeof block != 'string') return
		const blockCount = await this.rpc.getBlockCount()
		if (blockCount < this.blockHeight || !this.canSincronize) return
		
		await this.rewindTransactions(block)
		/**
		 * Faz um request no rpc para saber se ele está respondendo ou não
		 * 
		 * O getInfo tem um handler que vai emitir 'node_connected' ou
		 * 'node_disconnected' de acordo com a resposta recebida, que é o motivo
		 * dessa function call estar aqui
		 */
		this.rpc.getRpcInfo().catch(err => {
			if (err !== 'ECONNREFUSED')
				console.error('Error sendig ping to bitcoin', err)
		})

		/**
		 * @todo O handler de DocumentNotFoundError está aí porque ao receber
		 * vários blocos em seguida, como, por exemplo, ao ligar o node da
		 * bitcoin (e ele receber todos os blocos não recebidos), pode acontecer
		 * de os blocos serem recebidos antes do bloco anterior ter sido
		 * processado, que pode causar essa função tentar acessar uma transação
		 * pendente que já foi removida, que vai diparar um erro no mongo;
		 * Seria melhor encontrar uma SOLUÇÃO pra isso ao invés de um workaround
		 * Aliás, esse workaround não impede que a tx seja informada 2x ao qdo
		 * confirmada, que dispara um operationNotFound
		 */
		try {
			/** Todas as transactions received não confirmadas no database */
			const received: PReceived[] = await ReceivedPending.find()
			if (received.length > 0) {
				const promises = received.map(tx => processReceived(tx))
				Promise.all(promises).catch(err => {
					if (err.name != 'DocumentNotFoundError')
						console.error('Error processing received transactions', err)
				})
			}
			
			/** Todas as transações ENVIADAS e não confirmadas no database */
			const sended: PSent[] = await SendPending.find({
				'transaction.txid': { $exists: true }
			})
			if (sended.length > 0) {
				const promises = sended.map(tx => processSended(tx))
				Promise.all(promises).catch(err => {
					if (err.name != 'DocumentNotFoundError')
						console.error('Error processing sended transactions', err)
				})
			}
		} catch(err) {
			console.error('Error fetching unconfirmed transactions', err)
		}
	}

	return _processBlock
}
