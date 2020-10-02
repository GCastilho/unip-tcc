import { EventEmitter } from 'events'
import { ObjectId } from 'mongodb'
import Person from '../../db/models/person'
import ChecklistDoc from '../../db/models/checklist'
import TransactionDoc, { Transaction } from '../../db/models/transaction'
import * as methods from './methods'
import * as UserApi from '../../userApi'
import type TypedEmitter from 'typed-emitter'
import type User from '../../userApi/user'
import type { TxInfo, UpdtReceived, UpdtSent, CancelledSentTx } from '../../../interfaces/transaction'
import type { SuportedCurrencies } from '../../libs/currencies'
import type { MainEvents, ListenerFunctions, ExternalEvents } from '../../../interfaces/communication/external-socket'

/** Type para um callback genérico */
type Callback = (err: any, response?: any) => void

/** Interface para padronizar os eventos públicos */
interface PublicEvents {
	new_transaction: (id: User['id'], transaction: TxInfo) => void
	update_received_tx: (id: User['id'], txUpdate: UpdtReceived) => void
	update_sent_tx: (id: User['id'], txUpdate: UpdtSent|CancelledSentTx) => void
}

/** Interface para padronizar os eventos privados */
type PrivateEvents = {
	connected: () => void
	disconnected: () => void
	emit: (event: string, args: any[], callback: Callback) => void
} & ListenerFunctions<ExternalEvents>

/** Classe de uma currency suportada pela CurrencyApi */
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

	public async createAccount(userId: ObjectId): Promise<string> {
		const account = await this.emit('create_new_account')
		await Person.findByIdAndUpdate(userId, {
			$push: {
				[`currencies.${this.name}.accounts`]: account
			}
		})
		return account
	}

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
				console.log('Sent withdraw request', {
					opid: transaction._id.toHexString(),
					account: transaction.account,
					amount: transaction.amount.toFullString()
				})
			} else {
				console.log('Presuming the transaction', transaction._id, 'was cancelled. Withdraw skipped')
			}
		} catch (err) {
			if (err == 'SocketDisconnected') {
				await TransactionDoc.updateOne({ _id: transaction._id }, { status: 'ready' })
			} else if (err.code != 'OperationExists') {
				throw err
			}
		}
	}

	/** Processa requests de cancelamento de saque */
	public async cancellWithdraw(userId: ObjectId, opid: ObjectId): Promise<'cancelled'|'requested'> {
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
					await this.emit('cancell_withdraw', opid.toHexString())
				} else {
					/**
					 * Teoricamente também tem como ela ter estado no 'picked' qdo o
					 * cancell foi feito
					 */
					throw 'AlreadyExecuted'
				}
			}

			const user = await UserApi.findUser.byId(userId)
			// Pode dar throw em OperationNotFound (não tem handler)
			await user.balanceOps.cancel(this.name, opid)
			await TransactionDoc.deleteOne({ _id: opid })

			return 'cancelled'
		} catch (err) {
			if (err == 'SocketDisconnected' ) {
				return 'requested'
			} else {
				throw err
			}
		}
	}

	constructor(
		name: SuportedCurrencies,
		fee: number
	) {
		this.name = name
		this.fee = fee

		// Chama a withraw para o evento de update_sent_tx ser colocado
		methods.withdraw.call(this)

		this._events.on('connected', () => {
			this.loop()
				.catch(err => console.error('Error on loop method for', this.name, err))
				.finally(() => this.looping = false)
		})
	}

	/** Flag que indica se o loop está sendo executado */
	private looping = false

	private async loop() {
		if (this.looping || !this.isOnline) return
		this.looping = true

		/**
		 * Chama o createAccount para todos os usuários com array de accounts vazio
		 */
		await Person.find({
			[`currencies.${this.name}.accounts`]: { $size: 0 }
		}).cursor().eachAsync(async doc => {
			try {
				await this.createAccount(doc._id)
			} catch (err) {
				if (err != 'SocketDisconnected') throw err
			}
		})

		/**
		 * Chama a cancellWithdraw para todas as transações que estavam no external
		 * e foram marcadas para serem canceladas
		 */
		await TransactionDoc.find({
			currency: this.name,
			status: 'cancelled'
		}).cursor().eachAsync(async doc => {
			const response = await this.cancellWithdraw(doc.userId, doc._id)
			if (response == 'cancelled') {
				this.events.emit('update_sent_tx', doc.userId, {
					opid: doc._id.toHexString(),
					status: 'cancelled'
				})
			}
		})

		/**
		 * Chama o withdraw para todas as transações prontas para serem executadas
		 */
		await TransactionDoc.find({
			currency: this.name,
			status: 'ready'
		}).cursor().eachAsync(doc => this.withdraw(doc))
	}
}
