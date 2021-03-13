import assert from 'assert'
import mongoose from 'mongoose'
import io from 'socket.io-client'
import { EventEmitter } from 'events'
import { startSession } from 'mongoose'
import Sync from './sync'
import { Batch, Single } from './scheduler'
import initListeners from './listeners'
import Transaction, { Receive, Send } from './db/models/transaction'
import type TypedEmitter from 'typed-emitter'
import type { Queue, BatchOptions } from './scheduler'
import type { ExternalEvents } from '../../interfaces/communication/external-socket'
import type { ReceiveDoc, SendDoc, CreateReceive, CreateSend, CreateSendRequest } from './db/models/transaction'

type Options = {
	/** Nome da Currency que se está trabalhando (igual ao da CurrencyAPI) */
	name: string
	/** Opções para configuração de transações em batch */
	batchOptions?: BatchOptions
}

/** Type do objeto de atualização de uma transação pendente */
type UpdateTx = Pick<ReceiveDoc|SendDoc, 'txid'|'status'|'confirmations'>

/** Type de um request do método de withdraw */
export type WithdrawRequest = Pick<CreateSendRequest, 'account'|'amount'>

/** Type da resposta do método de withdraw */
export type WithdrawResponse = Pick<CreateSend, 'txid'|'status'|'confirmations'|'timestamp'>

/** Type do argumento do método de newTransaction */
export type NewTransaction = Omit<CreateReceive, 'type'>

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

	/**
	 * Executa um request de saque em batch, enviando uma única transação para
	 * várias accounts
	 *
	 * @param batchRequest Um objeto em que as chaves são as accounts de destino
	 * e os valores são os amounts que devem ser enviados para essas accounts
	 */
	withdrawMany?(batchRequest: Record<string, number>): Promise<WithdrawResponse>

	/** Classe com métodos para sincronia de eventos com o main server */
	private sync: Sync

	/** Iterable da queue de requests de withdraw */
	protected withdrawQueue: Queue<Set<string>>

	/**
	 * EventEmitter para eventos internos
	 */
	protected events: TypedEmitter<{
		/** Conectado com o node da moeda */
		rpc_connected: () => void
		/** Desconectado do node da moeda */
		rpc_disconnected: () => void
		/** Conectado com o main server */
		connected: () => void
		/** Desconectado do main server */
		disconnected: () => void
		to_main_server: (...args: any[]) => void
	}> = new EventEmitter()

	/**
	 * Indica se o node da currency está online ou não
	 *
	 * Os listeners do 'rpc_connected' e 'rpc_disconnected' mantém essa variável
	 * atualizada
	 *
	 * NÃO MODIFICAR MANUALMENTE
	 */
	protected nodeOnline = false

	/** Nome da currency que está sendo trabalhada */
	public readonly name: string

	constructor(options: Options) {
		this.name = options.name
		this.sync = new Sync(this.emit.bind(this))

		/**
		 * Habilita o sistema de transações em batch caso a withdrawMany tenha
		 * sido implementada pelo sistema da currency
		 */
		this.withdrawQueue = typeof this.withdrawMany == 'function'
			? new Batch(options.batchOptions || {})
			: new Single()

		// Monitora os eventos do rpc para manter o nodeOnline atualizado
		this.events.on('rpc_connected', () => this.nodeOnline = true)
		this.events.on('rpc_disconnected', () => this.nodeOnline = false)

		// Inicializa e finaliza o withdrawQueue
		this.events.on('rpc_connected', () => this.processQueue())
		this.events.on('rpc_disconnected', () => this.withdrawQueue.stop())

		// Sincroniza transações com o main server
		this.events.on('connected', () => this.sync.uncompleted())
	}

	/** Conecta com o servidor principal */
	private connectToMainServer() {
		/** Socket de conexão com o servidor principal */
		const socket = io(`http://${mainServerIp}:${mainServerPort}/${this.name}`)
		initListeners.call(this, socket)
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
		for await (const opidSet of this.withdrawQueue) {
			const session = await startSession()
			session.startTransaction()

			try {
				/**
				 * Puxa os dados dos requests de saque do banco, filtrando os que foram
				 * cancelados. Inicia uma session no find para impedir que eles sejam
				 * cancelados no meio dessa operação
				 */
				await Send.updateMany({
					opid: {
						$in: Array.from(opidSet)
					},
					status: 'requested',
					picked: undefined,
				}, {
					picked: true,
				}, {
					session
				})
				const requests = await Send.find({
					opid: {
						$in: Array.from(opidSet)
					},
					picked: true,
				}, {
					opid: 1,
					account: 1,
					amount: 1,
				}, {
					session,
				}).orFail().map(txs => txs.map(tx => ({
					opid:    tx.opid.toHexString(),
					account: tx.account,
					amount:  tx.amount,
				})))

				let response: WithdrawResponse
				if (requests.length == 1) {
					const { opid, account, amount } = requests[0]
					response = await this.withdraw({ account, amount })
					console.log('Sent new transaction:', {
						opid,
						account,
						amount,
						...response
					})
					await Send.updateOne({ opid }, {
						...response,
						$unset: { picked: true },
					}, { session })
				} else if (requests.length > 1) {
					assert(
						typeof this.withdrawMany == 'function',
						'withdrawMany is not implemented, yet it was activated by Common. This is unacceptable'
					)

					const batch = requests.reduce((acc, cur) => {
						const storedAmount = acc.get(cur.account) || 0
						acc.set(cur.account, storedAmount + Number(cur.amount))
						return acc
					}, new Map<string, number>())

					response = await this.withdrawMany(Object.fromEntries(batch))
					console.log('Sent many new transactions', response, requests)

					await Send.updateMany({
						opid: {
							$in: requests.map(req => req.opid)
						}
					}, {
						...response,
						$unset: { picked: true },
					}, { session })
				} else {
					throw Object.assign(new Error(), {
						code: 'NotSent',
						message: `All requested transactions (${opidSet}) were cancelled`
					})
				}

				await session.commitTransaction()
				await session.endSession()

				await this.sync.updateSent(response)
			} catch (err) {
				await session.abortTransaction()
				session.endSession()

				if (err.code === 'NotSent') {
					const message = err?.message || err
					console.error('Withdraw - Transaction were not sent:', message)
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
			}
		}
	}

	async init() {
		const ip = process.env.MONGODB_IP || '127.0.0.1'
		const port = process.env.MONGODB_PORT || '27017'
		const dbName = process.env.MONGODB_DB_NAME || `exchange-${this.name}`

		const mongodb_url = process.env.MONGODB_URL || `mongodb://${ip}:${port}/${dbName}`

		process.stdout.write('Connecting to mongodb... ')
		await mongoose.connect(mongodb_url, {
			user: process.env.MONGODB_USER,
			pass: process.env.MONGODB_PASS,
			useNewUrlParser: true,
			useCreateIndex: true,
			useFindAndModify: false,
			useUnifiedTopology: true,
			// N sei se o melhor é 'snapshot' ou 'majority' aqui
			readConcern: 'snapshot',
			w: 'majority',
			j: true,
			wtimeout: 2000,
		}).catch(err => {
			console.error('Database connection error:', err)
			process.exit(1)
		})
		console.log('Connected')

		this.connectToMainServer()
		await this.initBlockchainListener()
	}

	/**
	 * Processa uma transação recebida, salvando-a no DB e informando o main
	 * @param transaction Os dados da transação recebida
	 */
	public async newTransaction(transaction: NewTransaction): Promise<void> {
		const doc = await Receive.create<ReceiveDoc>({
			...transaction,
			type: 'receive',
		})
		console.log('Received new transaction', transaction)
		await this.sync.newTransaction(doc)
	}

	/**
	 * Atualiza uma transação já existente. Não é necessário que a transação
	 * tenha sido informada ao main para esse método ser chamado
	 * @param txUpdate Os dados de atualização da transação
	 */
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
	protected emit<Event extends keyof ExternalEvents>(
		event: Event,
		...args: Parameters<ExternalEvents[Event]>
	): Promise<ReturnType<ExternalEvents[Event]>> {
		return new Promise((resolve, reject) => {
			console.log(`Transmitting socket event '${event}':`, ...args)
			this.events.emit('to_main_server', event, args, ((error, response) => {
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
