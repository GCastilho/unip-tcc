import { EventEmitter } from 'events'
import Checklist from '../../../db/models/checklist'
import * as methods from './methods'
import type TypedEmitter from 'typed-emitter'
import type { TxInfo, UpdtReceived, UpdtSent } from '../../../db/models/transaction'
import type User from '../../../userApi/user'

/**
 * Interface para padronizar os eventos públicos
 */
interface PublicEvents {
	new_transaction: (id: User['id'], transaction: TxInfo) => void
	update_received_tx: (id: User['id'], txUpdate: UpdtReceived) => void
	update_sent_tx: (id: User['id'], txUpdate: UpdtSent) => void
}

/**
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */
export default abstract class Common {
	/** O nome da currency que esta classe se comunica */
	abstract name: 'bitcoin' | 'nano'

	/** O código da currency */
	abstract code: string

	/** A quantidade de casas decimais que esta currency tem */
	public decimals = 8

	/** A quantidade de casas decimais desta currency que o sistema opera */
	public supportedDecimals = Math.min(this.decimals, 8)

	/** EventEmmiter para eventos internos */
	protected _events = new EventEmitter()

	/** Indica se o módulo externo está online ou não */
	protected isOnline = false

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
			let gotResponse = false
			if (!this.isOnline) return reject('SocketDisconnected')
			this._events.emit('emit', event, ...args, ((error, response) => {
				gotResponse = true
				if (error) return reject(error)
				resolve(response)
			}))
			setTimeout(() => {
				if (!gotResponse) reject('RequestTimeout')
			}, 1000)
		})
	}

	/** EventEmmiter para eventos públicos */
	public events = new EventEmitter() as TypedEmitter<PublicEvents>

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
