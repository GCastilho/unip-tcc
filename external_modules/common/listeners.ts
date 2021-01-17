// eslint-disable-next-line
const ss = require('socket.io-stream')
import Account from './db/models/account'
import { Send } from './db/models/transaction'
import type Common from '.'
import type { WithdrawRequest } from './../../interfaces/transaction'

/**
 * Inicializa os listeners do socket com o main server
 */
export default function initListeners(this: Common, socket: SocketIOClient.Socket) {
	/**
	 * Ouve por eventos vindos do método 'emit' e os retransmite ao socket
	 * para serem enviados ao main server
	 */
	this.events.on('to_main_server', (event: string, args: any[], callback: (...args: any[]) => void) => {
		if (socket.connected) {
			socket.emit(event, ...args, callback)
		} else {
			callback('SocketDisconnected')
		}
	})

	socket.on('connect', async () => {
		console.log('Connected to the main server')

		process.stdout.write(`Requesting ${this.name} accounts... `)
		const stream: NodeJS.ReadableStream = ss.createStream()
		ss(socket).emit('get_account_list', stream)

		stream.once('data', () => {
			console.log('Success\nReceiving and importing accounts into the database')
		})

		for await (const chunk of stream) {
			/** Cada chunk é uma account */
			await Account.updateOne({
				account: chunk.toString()
			}, {}, {
				upsert: true
			})
		}

		console.log('All accounts received and imported successfuly!')
		this.events.emit('connected')
	})

	socket.on('disconnect', () => {
		console.log('Disconnected from the main server')
		this.events.emit('disconnected')
	})

	socket.on('create_new_account', async (callback: (...args: any[]) => any) => {
		try {
			const account = await this.getNewAccount()
			await new Account({ account }).save()
			callback(null, account)
		} catch (err) {
			callback(err)
		}
	})

	socket.on('withdraw', async (request: WithdrawRequest, callback: (...args: any[]) => any) => {
		console.log('received withdraw request', request)
		/**
		 * Salva na pending e retorna um callback dando ciência do recebimento
		 * ou da falha
		 */
		try {
			await Send.createRequest(request)

			callback(null, `received withdraw request for '${request.opid}'`)
			this.withdrawQueue.push(request)
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
	})

	socket.on('cancell_withdraw', async (opid: WithdrawRequest['opid'], callback: (...args: any[]) => any) => {
		console.log('received cancell_withdraw request', opid)
		try {
			/**
			 * Se a transação for cancellada e houver falha ao comunicar a resposta
			 * ao main server requests de cancelamentos futuros vão dar
			 * DocumentNotFoundError, deixando a tx no limbo
			 */
			await Send.deleteOne({ opid, status: 'requested' }).orFail()
			callback(null, 'cancelled')
		} catch (err) {
			if (err.name == 'DocumentNotFoundError') {
				callback({
					code: 'AlreadyExecuted',
					message: 'The transaction cold not be cancelled because it was already sent to it\'s destination'
				})
			} else {
				console.error('Error cancelling withdraw request:', err)
				callback(err)
			}
		}
	})
}
