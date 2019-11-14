import io from 'socket.io-client'
import { EventEmitter } from 'events'
import * as methods from './methods'
import { init, Mongoose } from './db/mongoose'
import { Transaction } from '../../src/db/models/currencies/common'
export { Transaction } from '../../src/db/models/currencies/common'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

export default abstract class Common {
	abstract name: string
	abstract MAIN_SERVER_IP: string
	abstract MAIN_SERVER_PORT: number

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
		this.setupDatabase().then(() => {
			this.connectToMainServer()
			this.initBlockchainListener()
		})
	}

	/**
	 * Inicializa o database e seta a propriedade 'mongoose' da classe para o
	 * driver do mongoose
	 */
	private setupDatabase = async () => {
		const mongoose = await init(`exchange-${this.name}`)
		this.mongoose = mongoose
	}

	/**
	 * Conecta com o servidor principal
	 */
	private connectToMainServer = async () => {
		this.socket = io(`http://${this.MAIN_SERVER_IP}:${this.MAIN_SERVER_PORT}/${this.name}`)
		methods.listener.bind(this)()
	}

	/**
	 * EventEmitter para eventos internos
	 */
	protected _events = new Events()

	/**
	 * Driver de conexão com o mongoose
	 */
	protected mongoose: Mongoose

	/**
	 * Socket de conexão com o servidor principal
	 */
	protected socket: SocketIOClient.Socket

	/**
	 * Envia uma nova transação recebida ao servidr principal
	 * 
	 * @param transaction A transação recebida que será enviada ao servidor
	 * principal
	 */
	protected gotNewTransaction(transaction: Transaction): Promise<string> {
		return this.module('new_transaction', transaction)
	}

	/**
	 * Wrapper de comunicação com o socket do servidor principal
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 */
	protected module(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (this.socket.disconnected) reject('Socket is not connected')
			this.socket.emit(event, ...args, ((error, response) => {
				if (error)
					reject(error)
				else
					resolve(response)
			}))
		})
	}
}
