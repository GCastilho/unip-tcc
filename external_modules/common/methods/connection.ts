// eslint-disable-next-line
const ss = require('socket.io-stream')
import Common from '../index'
import Account from '../db/models/account'
import Transaction from '../db/models/transaction'
import { TxSend } from '../index'
import { SendPending } from '../db/models/pendingTx'

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
		} catch (err) {
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
		} catch (err) {
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
}
