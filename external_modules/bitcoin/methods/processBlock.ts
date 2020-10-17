import { ReceivedPending, PReceived, PSent, SendPending } from '../../common/db/models/pendingTx'
import { Bitcoin } from '../index'
import type { UpdtSent, UpdtReceived } from '../../../interfaces/transaction'

/**
 * Verifica a quantidade de confirmações de uma transação recebida e informa
 * o servidor principal
 *
 * Se uma transação foi confirmada, remove-a da collection da transações
 * não confirmadas
 */
async function processReceived(this: Bitcoin, doc: PReceived): Promise<void> {
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
async function processSended(this: Bitcoin, doc: PSent) {
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
export async function processBlock(this: Bitcoin, block: string) {
	if (typeof block != 'string') return
	const blockCount = (await this.rpc.blockInfo(block))?.height
	if (blockCount < this.blockHeight || this.rewinding) return

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
	 * handler de DocumentNotFoundError está aí porque ao receber
	 * vários blocos em seguida, como, por exemplo, ao ligar o node da
	 * bitcoin (e ele receber todos os blocos não recebidos), pode acontecer
	 * de os blocos serem recebidos antes do bloco anterior ter sido
	 * processado, que pode causar essa função tentar acessar uma transação
	 * pendente que já foi removida, que vai diparar um erro no mongo.
	 */
	try {
		/** Todas as transactions received não confirmadas no database */
		const received: PReceived[] = await ReceivedPending.find()
		if (received.length > 0) {
			const promises = received.map(tx => processReceived.call(this, tx))
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
			const promises = sended.map(tx => processSended.call(this, tx))
			Promise.all(promises).catch(err => {
				if (err.name != 'DocumentNotFoundError')
					console.error('Error processing sended transactions', err)
			})
		}
	} catch (err) {
		console.error('Error fetching unconfirmed transactions', err)
	}
}
