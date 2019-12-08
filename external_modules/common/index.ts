import io from 'socket.io-client'
import { EventEmitter } from 'events'
import * as methods from './methods'
import * as mongoose from './db/mongoose'
import { EMT as Transaction } from '../../src/db/models/transaction'
export { EMT as Transaction } from '../../src/db/models/transaction'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export default abstract class Common {
	abstract name: string
	abstract mainServerIp: string
	abstract mainServerPort: number

	/**
	 * Cria uma nova account para essa currency
	 */
	abstract createNewAccount(): Promise<string>

	/**
	 * Executa o request de saque de uma currency em sua blockchain
	 */
	abstract withdraw(address: string, ammount: number): Promise<Transaction>

	/**
	 * Inicia o listener de requests da blockchain
	 */
	abstract initBlockchainListener(): void

	/**
	 * Processa novas transações recebidas e as envia ao servidor principal
	 * 
	 * @param txid O txid da transação recém recebida
	 */
	abstract processTransaction(txid: Transaction['txid']): Promise<void>

	constructor() {
		this.connectionHandler = methods.connection
		this.sendToMainServer = methods.sendToMainServer.bind(this)()
	}

	async init() {
		await mongoose.init(`exchange-${this.name}`)
		await this.connectToMainServer()
		this.initBlockchainListener()
	}

	/**
	 * Handler da conexão com o servidor principal
	 */
	private connectionHandler: (socket: SocketIOClient.Socket) => void

	/**
	 * Conecta com o servidor principal
	 */
	private connectToMainServer = async () => {
		/**
		 * Socket de conexão com o servidor principal
		 */
		const socket = io(`http://${this.mainServerIp}:${this.mainServerPort}/${this.name}`)
		this.connectionHandler(socket)
	}

	/**
	 * Envia uma transação ao servidor principal e atualiza seuo opid no
	 * database
	 * 
	 * @param transaction A transação que será enviada ao servidor
	 * 
	 * @returns opid se o envio foi bem-sucedido
	 * @returns void se a transação não foi enviada
	 */
	protected sendToMainServer: (transaction: Transaction) => Promise<string|void>

	/**
	 * EventEmitter para eventos internos
	 */
	protected _events = new Events()

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
