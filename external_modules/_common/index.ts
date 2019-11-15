import io from 'socket.io-client'
import { EventEmitter } from 'events'
import * as methods from './methods'
import * as mongoose from './db/mongoose'
import { Transaction } from '../../src/db/models/currencies/common'
export { Transaction } from '../../src/db/models/currencies/common'

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
	 * @param transaction A transação que foi recebida da rede
	 */
	abstract processTransaction(transaction: Transaction): Promise<void>

	constructor() {
		this.connection = methods.connection
	}

	async init() {
		await mongoose.init(`exchange-${this.name}`)
		await this.connectToMainServer()
		this.initBlockchainListener()
	}

	/**
	 * Handler da conexão com o servidor principal
	 */
	private connection: (socket: SocketIOClient.Socket) => void

	/**
	 * Conecta com o servidor principal
	 */
	private connectToMainServer = async () => {
		/**
		 * Socket de conexão com o servidor principal
		 */
		const socket = io(`http://${this.mainServerIp}:${this.mainServerPort}/${this.name}`)
		this.connection(socket)
	}

	/**
	 * EventEmitter para eventos internos
	 */
	protected _events = new Events()

	/**
	 * Wrapper de comunicação com o socket do servidor principal
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 */
	protected module(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			this._events.emit('module', event, ...args, ((error, response) => {
				if (error)
					reject(error)
				else
					resolve(response)
			}))
		})
	}
}
