import { EventEmitter } from 'events'
import { ObjectId } from 'mongodb'
import Checklist from '../../db/models/checklist'
import * as methods from './methods'
import type TypedEmitter from 'typed-emitter'
import type User from '../../userApi/user'
import type { TxInfo, UpdtReceived, UpdtSent, CancelledSentTx } from '../../../interfaces/transaction'
import type { SuportedCurrencies } from '../../libs/currencies'
import type { Events as ExternalEvents } from '../../../interfaces/communication/external-socket'

/**
 * Interface para padronizar os eventos públicos
 */
interface PublicEvents {
	new_transaction: (id: User['id'], transaction: TxInfo) => void
	update_received_tx: (id: User['id'], txUpdate: UpdtReceived) => void
	update_sent_tx: (id: User['id'], txUpdate: UpdtSent|CancelledSentTx) => void
}

/**
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */
export default class Currency {
	/** O nome da currency que esta classe se comunica */
	public readonly name: SuportedCurrencies

	/** Taxa cobrada do usuário para executar operações de saque */
	public readonly fee: number

	/** A quantidade de casas decimais desta currency que o sistema opera */
	public decimals = 8

	/** EventEmmiter para eventos internos */
	protected _events = new EventEmitter()

	/** Indica se o módulo externo está online ou não */
	protected isOnline = false

	/** Limpa os comandos com status 'completed' da checklist */
	protected checklistCleaner = async (): Promise<void> => {
		await Checklist.deleteMany({
			$or: [
				{ status: 'completed' },
				{ status: 'cancelled' }
			]
		})
	}

	/**
	 * Wrapper de comunicação com o socket do módulo externo
	 *
	 * @param event O evento que será enviado ao socket
	 * @param args Os argumentos desse evento
	 *
	 * @throws 'SocketDisconnected' if socket is disconnected
	 */
	protected emit<Event extends keyof ExternalEvents>(
		event: Event,
		...args: Parameters<ExternalEvents[Event]>
	): Promise<ReturnType<ExternalEvents[Event]>> {
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
			}, 10000)
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

	/** Varre a checklist e tenta enviar eventos de cancell withdraw para os opId*/
	private cancellWithdrawLoop: () => Promise<void>

	/** Varre a checklist e tenta enviar eventos de cancell withdraw para os opId*/
	public cancellWithdraw: (userid: ObjectId, opid: ObjectId) => Promise<string>

	constructor(
		name: SuportedCurrencies,
		fee: number
	) {
		this.name = name
		this.fee = fee

		this.create_account = methods.create_account.bind(this)()
		this.withdraw = methods.withdraw.bind(this)()
		this.cancellWithdrawLoop = methods.cancell_withdraw_loop.bind(this)()
		this.cancellWithdraw = methods.cancell_withdraw.bind(this)

		this._events.on('connected', () => {
			this.create_account()
			this.withdraw()
			this.cancellWithdrawLoop()
		})
	}
}
