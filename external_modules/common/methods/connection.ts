// eslint-disable-next-line
const ss = require('socket.io-stream')
import Common from '../index'
import Account from '../db/models/account'
import Transaction from '../db/models/transaction'
import { SendPending } from '../db/models/pendingTx'
import type { TxSend } from '../../../interfaces/transaction'

/**
 * Essa função é o handler de requests vindos do servidor principal
 */
export function connection(this: Common, socket: SocketIOClient.Socket) {
	/**
	 * Ouve por eventos vindos do método 'module' e os retransmite ao socket
	 * para serem enviados ao main server
	 */
	this._events.on('module', (event: string, ...args: any) => {
		if (socket.connected) {
			socket.emit(event, ...args)
		} else {
			/** O último argumento é o callback do evento */
			const callback: Function = args[args.length - 1]
			callback('SocketDisconnected')
		}
	})

	socket.on('connect', async () => {
		console.log('Connected to the main server')

		process.stdout.write(`Requesting ${this.name} accounts...`)
		const stream: NodeJS.ReadableStream = ss.createStream()
		ss(socket).emit('get_account_list', stream)

		stream.once('data', () => {
			console.log('Success\nReceiving and importing accounts into the database')
		})

		stream.on('data', (chunk) => {
			/** Cada chunk é uma account */
			Account.updateOne({
				account: chunk.toString()
			}, {}, {
				upsert: true
			}).exec()
		})

		stream.on('end', () => {
			console.log('All accounts received and imported successfuly!')
			this._events.emit('connected')
		})
	})

	socket.on('disconnect', () => {
		console.log('Disconnected from the main server')
		this._events.emit('disconnected')
	})

	socket.on('create_new_account', async (callback: Function) => {
		try {
			const account = await this.getNewAccount()
			await new Account({ account }).save()
			callback(null, account)
		} catch(err) {
			callback(err)
		}
	})

	socket.on('withdraw', async (request: TxSend, callback: Function) => {
		console.log('received withdraw request', request)
		/**
		 * Salva na pending e retorna um callback dando ciência do recebimento
		 * ou da falha
		 */
		try {
			await new Transaction({
				opid: request.opid,
				account: request.account,
				type: 'send'
			}).save()

			await new SendPending({
				opid: request.opid,
				transaction: request
			}).save()

			callback(null, `received withdraw request for '${request.opid}'`)
		} catch(err) {
			if (err.code === 11000) {
				callback({
					code: 'OperationExists',
					message: 'This opid was already received',
					opid: request.opid
				})
			} else {
				console.error('Error receiving withdraw request:', err)
				callback(err)
			}
		}

		/** Faz o withdraw de todas as transações ainda não enviadas */
		this.withdraw_pending()
	})

	socket.on('cancell_withdraw', async (opid: TxSend['opid'], callback: Function) => {
		console.log('received cancell_withdraw request', opid)
		try {
			/**
			 * Se a transação for cancellada mas não foi informada ao main server, ela
			 * vai ter sido deletada daqui, então requests futuros vão var opNotFound
			 * mas não vai ter op para cancelar mais, então ela vai estar no limbo
			 */
			const doc = await SendPending.findOneAndRemove({ opid })
			const tx = await Transaction.findOne({ opid })
			if (doc) {
				callback(null, 'cancelled')
				tx?.remove()
			} else if (tx?.txid) {
				callback({
					code: 'AlreadyExecuted',
					message: 'The transaction cold not be cancelled because it was already sent to it\'s destination'
				})
			} else {
				if (!tx) {
					await new Transaction({
						opid: opid,
						account: '0000000-CANCELLED-000000',
						type: 'send'
					}).save()
				}
				callback(null, 'cancelled')
			}
		} catch(err) {
			console.error('Error cancelling request:', err)
			callback(err)
		}
	})
}
