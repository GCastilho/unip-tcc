import socketIO from 'socket.io'
import ss from 'socket.io-stream'
import { ObjectId } from 'mongodb'
import { EventEmitter } from 'events'
import initListeners from './listeners'
import Person from '../../db/models/person'
import Transaction, { TransactionDoc } from '../../db/models/transaction'
import type TypedEmitter from 'typed-emitter'
import type { PersonDoc } from '../../db/models/person'
import type { SuportedCurrencies } from '../../libs/currencies'
import type { TxInfo, UpdtReceived, UpdtSent, CancellSent } from '../../../interfaces/transaction'
import type { MainEvents, ListenerFunctions, ExternalEvents } from '../../../interfaces/communication/external-socket'

/** Type para um callback genérico */
type Callback = (err: any, response?: any) => void

/** Interface para padronizar os eventos públicos */
interface PublicEvents {
	new_transaction: (id: PersonDoc['_id'], transaction: TxInfo) => void
	update_received_tx: (id: PersonDoc['_id'], txUpdate: UpdtReceived) => void
	update_sent_tx: (id: PersonDoc['_id'], txUpdate: UpdtSent|CancellSent) => void
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

	/** EventEmmiter para eventos públicos */
	public events = new EventEmitter() as TypedEmitter<PublicEvents>

	/** EventEmmiter para eventos internos */
	protected _events = new EventEmitter() as TypedEmitter<PrivateEvents>

	/** Indica se o módulo externo está online ou não */
	protected isOnline = false

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

	/**
	 * Pede uma nova account para o módulo externo e atualiza o
	 * documento do usuário
	 */
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
	public async withdraw(transaction: TransactionDoc): Promise<void> {
		try {
			const { nModified } = await Transaction.updateOne({
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
				await Transaction.updateOne({ _id: transaction._id }, { status: 'ready' })
			} else if (err.code != 'OperationExists') {
				throw err
			}
		}
	}

	/** Processa requests de cancelamento de saque */
	public async cancellWithdraw(userId: ObjectId, opid: ObjectId): Promise<'cancelled'|'requested'> {
		try {
			const { deletedCount } = await Transaction.deleteOne({ _id: opid, status: 'ready' })
			if (!deletedCount) {
				const { nModified } = await Transaction.updateOne({
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

			// Pode dar throw em OperationNotFound (não tem handler)
			await Person.balanceOps.cancel(userId, this.name, opid)
			await Transaction.deleteOne({ _id: opid })

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

		// Inicia os listeners do módulo externo
		initListeners.call(this)

		this._events.on('connected', () => {
			this.loop()
				.catch(err => console.error('Error on loop method for', this.name, err))
				.finally(() => this.looping = false)
		})
	}

	/** Handler da conexão com o módulo externo */
	public connection(socket: socketIO.Socket) {
		/*
		* Essa função é executada (pela currencyApi) quando o socket se conecta
		*/
		this.isOnline = true
		this._events.emit('connected')

		/**
		 * Emite um 'disconnected' no event emitter interno para informar aos outros
		 * métodos que o socket se desconectou
		 */
		socket.on('disconnect', () => {
			console.log(`Disconnected from the '${this.name}' module`)
			this.isOnline = false
			this._events.removeAllListeners('emit')
			this._events.emit('disconnected')
		})

		for (const event of this._events.eventNames()) {
		// Pula os eventos que não são do módulo externo
			switch (event) {
				case('connected'):
				case('disconnected'):
				case('emit'):
					continue
			}
			socket.on(event, (...args) => {
			// @ts-expect-error A tipagem desses eventos é feita separadamente
				this._events.emit(event, ...args)
			})
		}

		/**
		 * Retorna uma stream de strings de todas as accounts dos clientes, uma
		 * account por chunk
		 */
		ss(socket).on('get_account_list', (stream: NodeJS.WritableStream) => {
			const person = Person.find({}, {
				[`currencies.${this.name}`]: 1
			}).lean().cursor()

			person.on('data', ({ currencies }) => {
				if (Object.keys(currencies).length === 0) return
				currencies[this.name].accounts.forEach((account: string) => {
					stream.write(account)
				})
			})

			person.on('end', () => stream.end())
		})

		/**
		 * Ouve por eventos vindos do método 'module' e os retransmite ao socket
		 * para serem enviados ao módulo externo
		 */
		this._events.on('emit', (event, args, callback) => {
			console.log('event', event)
			if (this.isOnline) {
				socket.emit(event, ...args, callback)
			} else {
				callback('SocketDisconnected')
			}
		})
	}

	/** Flag que indica se o loop está sendo executado */
	private looping = false

	/** Envia requests pendentes aos módulos externos */
	private async loop() {
		if (this.looping || !this.isOnline) return
		this.looping = true

		/**
		 * Chama o createAccount para todos os usuários com array de accounts vazio
		 */
		await Person.find({
			[`currencies.${this.name}.accounts`]: { $size: 0 }
		}).cursor().eachAsync(async person => {
			try {
				await this.createAccount(person._id)
			} catch (err) {
				if (err != 'SocketDisconnected') throw err
			}
		})

		/**
		 * Chama a cancellWithdraw para todas as transações que estavam no external
		 * e foram marcadas para serem canceladas
		 */
		await Transaction.find({
			currency: this.name,
			status: 'cancelled'
		}).cursor().eachAsync(async tx => {
			const response = await this.cancellWithdraw(tx.userId, tx._id)
			if (response == 'cancelled') {
				this.events.emit('update_sent_tx', tx.userId, {
					opid: tx._id.toHexString(),
					status: 'cancelled'
				})
			}
		})

		/**
		 * Chama o withdraw para todas as transações prontas para serem executadas
		 */
		await Transaction.find({
			currency: this.name,
			status: 'ready'
		}).cursor().eachAsync(tx => this.withdraw(tx))
	}
}
