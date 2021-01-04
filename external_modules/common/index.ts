import io from 'socket.io-client'
import { ObjectId } from 'mongodb'
import { EventEmitter } from 'events'
import Queue from './queue'
import Account from './db/models/account'
import Transaction, { Send } from './db/models/newTransactions'
import * as methods from './methods'
import * as mongoose from './db/mongoose'
import type { CreateReceive, SendRequestDoc } from './db/models/newTransactions'
import type { TxReceived, UpdtSent, UpdtReceived } from '../../interfaces/transaction'

type Options = {
	/** Nome da Currency que se está trabalhando (igual ao da CurrencyAPI) */
	name: string
}

/** Type para atualização de uma transação recebida */
type UpdateReceivedTx = {
	/** O status dessa transação */
	status: 'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
}

/** Type para atualização de uma transação enviada */
export type UpdateSentTx = {
	/** O id dessa transação na rede da moeda */
	txid: string
	/** O timestamp da transação na rede da moeda */
	timestamp: number
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
	amount: number
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
	 * Executa o request de saque de uma currency em sua blockchain
	 *
	 * @param request O objeto com os dados do request de saque
	 * @returns WithdrawResponse Com os dados da transação enviada
	 */
	abstract withdraw(request: WithdrawRequest): Promise<UpdateSentTx>

	/**
	 * Handler da conexão com o servidor principal
	 */
	private connectionHandler: (socket: SocketIOClient.Socket) => void

	/** Iterable da queue de requests de withdraw */
	protected withdrawQueue: Queue<SendRequestDoc>

	/**
	 * EventEmitter para eventos internos
	 */
	protected _events = new EventEmitter()

	/** Nome da currency que está sendo trabalhada */
	public readonly name: string

	constructor(options: Options) {
		this.name = options.name
		this.withdrawQueue = new Queue()
		this.connectionHandler = methods.connection
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
	}

	private async bootstrapQueue() {
		for await (const request of Send.find({ status: 'requested' })) {
			this.withdrawQueue.push(request as SendRequestDoc)
		}

		// Esse loop é infinito
		// Falta o journaling (mongo transaction) para garantir que uma tx n é enviada 2x
		// Pq o request de withdraw não é indepotente
		// Tbm falta handler de erros
		for await (const request of this.withdrawQueue) {
			const response = await this.withdraw(request)
			await Send.updateOne(request._id, response)
			await this.updateSent(request._id, response)
		}
	}

	async init() {
		await mongoose.init(`exchange-${this.name}`)
		this.connectToMainServer()
		this.initBlockchainListener()
		this.bootstrapQueue()
	}

	/**
	 * Conecta com o servidor principal
	 */
	private connectToMainServer = () => {
		/**
		 * Socket de conexão com o servidor principal
		 */
		const socket = io(`http://${mainServerIp}:${mainServerPort}/${this.name}`)
		this.connectionHandler(socket)
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
	 * Vasculha a collection 'pendingTx' em busca de transações não enviadas
	 * e chama a função de withdraw para cara um delas
	 */
	protected withdraw_pending = methods.withdraw_pending.bind(this)()

	/**
	 * Contém métodos para atualizar o main server a respeito de transações
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

	public async newTransaction(transaction: CreateReceive): Promise<void> {
		const doc = await Transaction.create(transaction)
		try {
			const opid: string = await this.emit('new_transaction', transaction)
			doc.opid = new ObjectId(opid)
			if (transaction.status == 'confirmed') doc.completed = true
			await doc.save()
		} catch (err) {
			if (err === 'SocketDisconnected') {
				console.error('Não foi possível informar o main server da nova transação pois ele estava offline')
			} else if (err.code === 'UserNotFound') {
				await Account.deleteOne({ account: transaction.account })
				await Transaction.deleteMany({ account: transaction.account })
			} else if (err.code === 'TransactionExists' && err.transaction.opid) {
				doc.opid = new ObjectId(err.transaction.opid)
				await doc.save()
			} else {
				throw err
			}
		}
	}

	public async updateReceived(txid: string, updtReceived: UpdateReceivedTx): Promise<void> {
		await Transaction.updateOne({
			txid,
			type: 'receive',
		}, {
			confirmations: updtReceived.status === 'confirmed' ? undefined : updtReceived.confirmations,
			status: updtReceived.status,
		}).orFail()
		try {
			// O evento está faltando o txid
			await this.emit('update_received_tx', updtReceived)
			if (updtReceived.status == 'confirmed') {
				await Transaction.updateOne({
					txid,
					type: 'receive',
				}, {
					completed: true,
				})
			}
		} catch (err) {
			if (err === 'SocketDisconnected') return
			/**
			 * OperationNotFound significa ou que a transação não existe
			 * no main server ou que ela foi concluída (e está inacessível
			 * a um update)
			 */
			if (err.code != 'OperationNotFound') throw err
		}
	}

	public async updateSent(opid: ObjectId, updtSent: UpdateSentTx): Promise<void> {
		await Transaction.updateOne({ opid }, updtSent).orFail()
		try {
			// O evento está faltando o opid
			await this.emit('update_sent_tx', updtSent)
			if (updtSent.status == 'confirmed') {
				await Transaction.updateOne({ opid }, { completed: true, })
			}
		} catch (err) {
			if (err === 'SocketDisconnected') return
			if (err.code === 'OperationNotFound') {
				console.error(`Deleting non-existent withdraw transaction with opid: '${opid}'`)
				await Transaction.deleteOne({ opid })
			} else
				throw err
		}
	}

	public async syncMain() {
		for await (const tx of Transaction.find({ completed: false })) {
			if (tx.type == 'receive') {
				if (tx.opid) {
					// ESSE NÃO É O ARGUMENTO DO EVENTO
					await this.emit('update_received_tx', tx)
				} else {
					// ESSE NÃO É O ARGUMENTO DO EVENTO
					const opid = await this.emit('new_transaction', tx)
					tx.opid = new ObjectId(opid)
				}
			} else {
				// ESSE NÃO É O ARGUMENTO DO EVENTO
				await this.emit('update_sent_tx', tx)
			}
			if (tx.status == 'confirmed') tx.completed = true
			// @ts-expect-error TS não reconhece que é callable pq Transaction é um union type
			// See https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-3.html#caveats
			await tx.save()
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
