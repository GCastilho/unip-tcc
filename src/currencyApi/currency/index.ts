import { EventEmitter } from 'events'
import { ObjectId } from 'mongodb'
import ChecklistDoc from '../../db/models/checklist'
import TransactionDoc, { Transaction } from '../../db/models/transaction'
import * as methods from './methods'
import * as UserApi from '../../userApi'
import type TypedEmitter from 'typed-emitter'
import type User from '../../userApi/user'
import type { TxInfo, UpdtReceived, UpdtSent, CancelledSentTx } from '../../../interfaces/transaction'
import type { SuportedCurrencies } from '../../libs/currencies'
import type { MainEvents } from '../../../interfaces/communication/external-socket'

/** Type para um callback genérico */
type Callback = (err: any, response?: any) => void

/** Interface para padronizar os eventos públicos */
interface PublicEvents {
	new_transaction: (id: User['id'], transaction: TxInfo) => void
	update_received_tx: (id: User['id'], txUpdate: UpdtReceived) => void
	update_sent_tx: (id: User['id'], txUpdate: UpdtSent|CancelledSentTx) => void
}

/** Interface para padronizar os eventos privados */
interface PrivateEvents {
	connected: () => void
	disconnected: () => void
	emit: (event: string, args: any[], callback: Callback) => void
	update_sent_tx: (updtSended: UpdtSent, callback: Callback) => void
}

/**
 * Classe abstrata dos módulos comuns de todas as currencyModules
 */
export default class Currency {
	/** O nome da currency que esta classe se comunica */
	public readonly name: SuportedCurrencies

	/** Taxa cobrada do usuário para executar operações de saque */
	public readonly fee: number

	/** EventEmmiter para eventos internos */
	protected _events = new EventEmitter() as TypedEmitter<PrivateEvents>

	/** Indica se o módulo externo está online ou não */
	protected isOnline = false

	/** Limpa os comandos com status 'completed' da checklist */
	protected checklistCleaner = async (): Promise<void> => {
		await ChecklistDoc.deleteMany({
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
	protected emit<Event extends keyof MainEvents>(
		event: Event,
		...args: Parameters<MainEvents[Event]>
	): Promise<ReturnType<MainEvents[Event]>> {
		return new Promise((resolve, reject) => {
			let gotResponse = false
			if (!this.isOnline) return reject('SocketDisconnected')
			this._events.emit('emit', event, args, ((error, response) => {
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

	/** Manda requests de saque para o módulo externos */
	public async withdraw(transaction: Transaction): Promise<void> {
		try {
			const { nModified } = await TransactionDoc.updateOne({
				_id: transaction._id,
				status: 'ready'
			}, {
				status: 'picked'
			})
			if (nModified) {
				await this.emit('withdraw', {
					opid: transaction._id.toHexString(),
					account: transaction.account,
					amount: transaction.amount.toFullString()
				})
				transaction.status = 'external'
				await transaction.save()
				console.log('sent withdraw request', transaction)
			} else {
				console.log('presuming transaction', transaction._id, 'was cancelled')
			}
		} catch(err) {
			if (err == 'SocketDisconnected') {
				await TransactionDoc.updateOne({ _id: transaction._id }, { status: 'ready' })
			} else if (err.code != 'OperationExists') {
				throw err
			}
		}
	}

	/** Processa requests de cancelamento de saque */
	public async cancellWithdraw(userId: ObjectId, opid: ObjectId): Promise<string> {
		try {
			const { deletedCount } = await TransactionDoc.deleteOne({ _id: opid, status: 'ready' })
			if (!deletedCount) {
				const { nModified } = await TransactionDoc.updateOne({
					_id: opid,
					status: 'external'
				}, {
					status: 'cancelled'
				})
				if (nModified) {
					const response = await this.emit('cancell_withdraw', opid.toHexString())

					const user = await UserApi.findUser.byId(userId)
					// Pode dar throw em OperationNotFound (não tem handler)
					await user.balanceOps.cancel(this.name, opid)
					await TransactionDoc.deleteOne({ _id: opid })

					return response
				} else {
					throw 'not found? picked?'
				}
			} else {
				const user = await UserApi.findUser.byId(userId)
				// Pode dar throw em OperationNotFound (não tem handler)
				await user.balanceOps.cancel(this.name, opid)
				await TransactionDoc.deleteOne({ _id: opid })
				return 'cancelled'
			}
		} catch(err) {
			if (err == 'SocketDisconnected' ) {
				return 'requested'
			} else {
				switch (err.code) {
					case'AlreadyExecuted':
					case'OperationNotFound':
						return err.code
					default:
						throw err
				}
			}
		}
	}

	constructor(
		name: SuportedCurrencies,
		fee: number
	) {
		this.name = name
		this.fee = fee

		this.create_account = methods.create_account.bind(this)()

		// Chama a withraw para o evento de update_sent_tx ser colocado
		methods.withdraw.call(this)

		this._events.on('connected', () => {
			this.create_account()
			this.loop()
				.catch(err => console.error('Error on loop method for', this.name, err))
		})
	}

	/** Flag que indica se o loop está sendo executado */
	private looping = false

	private async loop() {
		if (this.looping || !this.isOnline) return
		this.looping = true

		/**
		 * Cursor com as transações que estão no external e foram marcadas para
		 * serem canceladas
		 */
		const cancellCursor = TransactionDoc.find({
			currency: this.name,
			status: 'cancelled'
		}).cursor()

		let cTx: Transaction
		while (this.isOnline && (cTx = await cancellCursor.next())) {
			const response = await this.cancellWithdraw(cTx.userId, cTx._id)
			if (response == 'cancelled') {
				this.events.emit('update_sent_tx', cTx.userId, {
					opid: cTx._id.toHexString(),
					status: 'cancelled'
				})
			}
		}

		// Envia ao módulo externo requests de withdraw com status 'processing'
		const withdrawCursor = TransactionDoc.find({
			currency: this.name,
			status: 'ready'
		}).cursor()

		let tx: Transaction
		while (this.isOnline && (tx = await withdrawCursor.next())) {
			await this.withdraw(tx)
		}

		this.looping = false
	}
}
