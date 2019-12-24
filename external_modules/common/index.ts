import io from 'socket.io-client'
import { EventEmitter } from 'events'
import * as methods from './methods'
import * as mongoose from './db/mongoose'
import { TxReceived, UpdtSent, UpdtReceived } from '../../src/db/models/transaction'
export { TxReceived, TxSend, UpdtSent, UpdtReceived } from '../../src/db/models/transaction'
import { PSent } from './db/models/pendingTx'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export default abstract class Common {
	abstract name: string
	abstract mainServerIp: string
	abstract mainServerPort: number

	/**
	 * Pede uma nova account para o node dessa currency e a retorna
	 */
	abstract getNewAccount(): Promise<string>

	/**
	 * Executa o request de saque de uma currency em sua blockchain
	 * 
	 * @param pSended O documento dessa operação pendente na collection
	 * @param callback Caso transações foram agendadas para ser executadas em
	 * batch, o callback deve ser chamado com elas para informar que elas foram
	 * executadas
	 * 
	 * @returns UpdtSended object se a transação foi executada imediatamente
	 * @returns true se a transação foi agendada para ser executada em batch
	 */
	abstract withdraw(pSended: PSent, callback?: (transactions: UpdtSent[]) => void): Promise<UpdtSent|true>

	/**
	 * Inicia o listener de requests da blockchain
	 */
	abstract initBlockchainListener(): void

	/**
	 * Processa novas transações recebidas e as envia ao servidor principal
	 * 
	 * @param txid O txid da transação recém recebida
	 */
	abstract processTransaction(txid: TxReceived['txid']): Promise<void>

	/**
	 * EventEmitter para eventos internos
	 */
	protected _events = new Events()

	constructor() {
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

	async init() {
		await mongoose.init(`exchange-${this.name}`)
		this.connectToMainServer()
		this.initBlockchainListener()
	}

	/**
	 * Handler da conexão com o servidor principal
	 */
	private connectionHandler: (socket: SocketIOClient.Socket) => void

	/**
	 * Conecta com o servidor principal
	 */
	private connectToMainServer = () => {
		/**
		 * Socket de conexão com o servidor principal
		 */
		const socket = io(`http://${this.mainServerIp}:${this.mainServerPort}/${this.name}`)
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
	protected nodeOnline: boolean = false

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

	/**
	 * Wrapper de comunicação com o socket do servidor principal. Essa função
	 * resolve ou rejeita uma promessa AO RECEBER UMA RESPOSTA do main server,
	 * até lá ela ficará pendente
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 */
	protected module(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			console.log(`transmitting socket event '${event}':`, ...args)
			this._events.emit('module', event, ...args, ((error, response) => {
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