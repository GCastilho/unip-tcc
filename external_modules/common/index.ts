import io from 'socket.io-client'
import { EventEmitter } from 'events'
import { startSession } from 'mongoose'
import Sync from './sync'
import Queue from './queue'
import initListeners from './listeners'
import Transaction, { Receive, ReceiveDoc, Send, SendDoc } from './db/models/newTransactions'
import * as methods from './methods'
import * as mongoose from './db/mongoose'
import type { TxReceived, UpdtSent, UpdtReceived } from '../../interfaces/transaction'

type Options = {
	/** Nome da Currency que se está trabalhando (igual ao da CurrencyAPI) */
	name: string
}

/** Type do objeto de atualização de uma transação pendente */
type UpdateTx = {
	/** O id dessa transação na rede da moeda */
	txid: string
	/** O status dessa transação */
	status: 'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
}

/** Type de um request do método de withdraw */
export type WithdrawRequest = {
	/** account de destino da transação */
	account: string
	/** amount que deve ser enviado ao destino */
	amount: string|number
}

/** Type da resposta do método de withdraw */
export type WithdrawResponse = {
	/** O id dessa transação na rede da moeda */
	txid: string
	/** O status dessa transação */
	status: 'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
	/** O timestamp da transação na rede da moeda */
	timestamp: number
}

export type NewTransaction = {
	/** O id dessa transação na rede da moeda */
	txid: string
	/** account de destino da transação */
	account: string
	/** amount que deve ser enviado ao destino */
	amount: number|string
	/** O status dessa transação */
	status: 'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
	/** O timestamp da transação na rede da moeda */
	timestamp: number
}

/** URL do servidor principal */
const mainServerIp = process.env.MAIN_SERVER_IP || 'localhost'

/** Porta da CurrencyAPI no servidor principal */
const mainServerPort = parseInt(process.env.MAIN_SERVER_PORT || '8085')

export default abstract class Common {
	/**
	 * Pede uma nova account para o node dessa currency e a retorna
	 */
	abstract getNewAccount(): Promise<string>

	/**
	 * Inicia o listener de requests da blockchain
	 */
	abstract initBlockchainListener(): void

	/**
	 * Executa o request de saque de uma currency em sua blockchain. Esse método
	 * é presumido não ser indepotente
	 *
	 * @param request O objeto com os dados do request de saque
	 * @returns WithdrawResponse Com os dados da transação enviada
	 */
	abstract withdraw(request: WithdrawRequest): Promise<WithdrawResponse>

	/** Classe com métodos para sincronia de eventos com o main server */
	private sync: Sync

	/** Iterable da queue de requests de withdraw */
	protected withdrawQueue: Queue

	/**
	 * EventEmitter para eventos internos
	 */
	protected _events = new EventEmitter()

	/** Nome da currency que está sendo trabalhada */
	public readonly name: string

	constructor(options: Options) {
		this.name = options.name
		this.sync = new Sync(this.emit)
		this.withdrawQueue = new Queue()
		this.informMain = methods.informMain.bind(this)()

		// Monitora os eventos do rpc para manter o nodeOnline atualizado
		this._events.on('rpc_connected', () => {
			if (this.nodeOnline) return
			this.nodeOnline = true
			this._events.emit('node_connected')
		})
		this._events.on('rpc_disconnected', () => {
			if (!this.nodeOnline) return
			this.nodeOnline = false
			this._events.emit('node_disconnected')
		})

		// Inicializa e finaliza o withdrawQueue
		this._events.on('node_connected', () => this.processQueue())
		this._events.on('node_disconnected', () => this.withdrawQueue.stop())

		// Sincroniza transações com o main server
		this._events.on('connected', () => this.sync.uncompleted())
	}

	/**
	 * Processa a withdrawQueue, infinitamente e de forma assíncrona, até o
	 * método stop ser invocado (clean exit) ou um erro não reconhecido ser
	 * recebido de um dos métodos utilizados
	 *
	 * Um Error com code 'NotSent' é esperado para situações onde há certeza
	 * que a transação não foi enviada
	 */
	private async processQueue() {
		for await (const { opid, account, amount } of this.withdrawQueue) {
			const session = await startSession()
			session.startTransaction()

			try {
				// Find para checar se a tx n foi cancelada
				await Send.findOne({ opid, status: 'requested' }, { _id: 1 }, { session })

				const response = await this.withdraw({ account, amount })
				console.log('Sent new transaction:', {
					opid,
					account,
					amount,
					...response
				})

				await Send.updateOne({ opid }, response, { session })
				await this.sync.updateSent(response, session)

				await session.commitTransaction()
			} catch (err) {
				await session.abortTransaction()
				if (err.code === 'NotSent') {
					const message = err.message ? err.message : err
					console.error('Withdraw: Transaction was not sent:', message)
					break
				} else if (err.name != 'DocumentNotFoundError') {
					// Como usa transaction, DocumentNotFoundError só pode ocorrer no find
					/**
					 * Não há garantia que a tx não foi enviada, interrompe o processo
					 * para impedir que esse erro se propague de alguma forma
					 */
					console.error('Unknown error while processing withdraw queue:', err)
					/**
					 * @todo Um error code específico para erro de withdraw. Pode agilizar
					 * a análise do log
					 */
					process.exit(1)
				}
			} finally {
				await session.endSession()
			}
		}
	}

	async init() {
		await mongoose.init(`exchange-${this.name}`)
		this.connectToMainServer()
		this.initBlockchainListener()
	}

	/** Conecta com o servidor principal */
	private connectToMainServer() {
		/** Socket de conexão com o servidor principal */
		const socket = io(`http://${mainServerIp}:${mainServerPort}/${this.name}`)
		initListeners.call(this, socket)
	}

	/**
	 * Indica se o node da currency está online ou não
	 *
	 * Os eventos 'node_connected' e 'node_disconnected' devem ser disparados
	 * no event emitter interno para manter essa váriável atualizada e outras
	 * partes do sistema que dependem desses eventos, funcionando
	 *
	 * NÃO MODIFICAR MANUALMENTE
	 */
	protected nodeOnline = false

	/**
	 * Contém métodos para atualizar o main server a respeito de transações
	 * @deprecated Substituído pelo método 'sync'
	 */
	informMain: {
		/**
		 * Envia uma transação ao servidor principal e atualiza o opid dela no
		 * database
		 *
		 * @param transaction A transação que será enviada ao servidor
		 *
		 * @returns opid se o envio foi bem-sucedido e a transação está pendente
		 * @returns void se a transação não foi enviada ou se estava confirmada
		 */
		newTransaction (transaction: TxReceived): Promise<string|void>
		/**
		 * Atualiza uma transação recebida previamente informada ao main server
		 * @param txUpdate A atualização da atualização recebida
		 */
		updateReceivedTx (txUpdate: UpdtReceived): Promise<void>
		/**
		 * Atualiza um request de withdraw recebido do main server
		 * @param transaction A atualização da transação enviada
		 */
		updateWithdraw (transaction: UpdtSent): Promise<void>
	}

	public async newTransaction(transaction: NewTransaction): Promise<void> {
		const doc = await Receive.create<ReceiveDoc>({
			type: 'receive',
			...transaction
		})
		console.log('Received new transaction', transaction)
		await this.sync.newTransaction(doc)
	}

	public async updateTx(txUpdate: UpdateTx) {
		const { txid, ...updtTx } = txUpdate
		const tx = await Transaction.findOneAndUpdate({
			txid
		}, updtTx, {
			new: true
		}).orFail() as ReceiveDoc|SendDoc

		if (tx.type == 'receive') {
			if (tx.opid) await this.sync.updateReceived(tx)
			else await this.sync.newTransaction(tx)
		} else {
			await this.sync.updateSent(tx)
		}
	}

	/**
	 * Wrapper de comunicação com o socket do servidor principal. Essa função
	 * resolve ou rejeita uma promessa AO RECEBER UMA RESPOSTA do main server,
	 * até lá ela ficará pendente
	 *
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 */
	protected emit(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			console.log(`transmitting socket event '${event}':`, ...args)
			this._events.emit('to_main_server', event, ...args, ((error, response) => {
				if (error) {
					console.error('Received socket error:', error)
					reject(error)
				} else {
					console.log('Received socket response:', response)
					resolve(response)
				}
			}))
		})
	}
}
