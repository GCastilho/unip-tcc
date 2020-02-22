import Checklist from '../../../db/models/checklist'
import * as methods from './methods'
import { EventEmitter } from 'events'

/**
 * EventEmmiter genérico
 */
class Events extends EventEmitter {}

/**
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */
export default abstract class Common {
	/** O nome da currency que esta classe se comunica */
	abstract name: 'bitcoin'|'nano'

	/** O código da currency */
	abstract code: string

	/** A quantidade de casas decimais que esta currency tem */
	public decimals: number = 8

	/** A quantidade de casas decimais desta currency que o sistema opera */
	public supportedDecimals: number = 8

	/** EventEmmiter para eventos internos */
	protected _events = new Events()

	/** Indica se o módulo externo está online ou não */
	protected isOnline: boolean = false

	/** Limpa os comandos com status 'completed' da checklist */
	protected checklistCleaner = async (): Promise<void> => {
		await Checklist.deleteMany({ status: 'completed' })
	}

	/**
	 * Wrapper de comunicação com o socket do módulo externo
	 * 
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 * 
	 * @throws SocketDisconnected if socket is disconnected
	 */
	protected emit(event: string, ...args: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.isOnline) reject('SocketDisconnected')
			this._events.emit('emit', event, ...args, ((error, response) => {
				if (error)
					reject(error)
				else
					resolve(response)
			}))
		})
	}

	/** EventEmmiter para eventos públicos */
	public events = new Events()

	/** Handler da conexão com o módulo externo */
	public connection = methods.connection

	/** Varre a checklist e executa as ordens de create_accounts agendadas */
	public create_account: () => Promise<void>

	/** Varre a checklist e executa as ordens de withdraw agendadas */
	public withdraw: () => Promise<void>

	constructor() {
		this.create_account = methods.create_account.bind(this)()
		this.withdraw = methods.withdraw.bind(this)()

		this._events.on('connected', () => {
			this.create_account()
			this.withdraw()
		})
	}
}
