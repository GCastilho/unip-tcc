const ss = require('socket.io-stream')
import Common from '../index'
import Account from '../db/models/account'
import { Transaction } from '../index'

/**
 * Essa função é o handler de requests vindos do servidor principal
 */
export function connection(this: Common, socket: SocketIOClient.Socket) {
	/**
	 * Ouve por eventos vindos do método 'module' e os retransmite ao socket
	 * para serem enviados ao módulo externo
	 */
	this._events.on('module', (event: string, ...args: any) => {
		if (socket.connected) {
			socket.emit(event, ...args)
		} else {
			/** O último argumento é o callback do evento */
			const callback: Function = args[args.length - 1]
			callback('Socket disconnected')
		}
	})

	socket.on('connect', async () => {
		console.log(`Connected to the main server`)

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
			console.log(`All accounts received and imported successfuly!`)
		})
	})

	socket.on('disconnect', () => {
		console.log(`Disconnected from the main server`)
	})

	socket.on('create_new_account', (callback: Function) => {
		this.createNewAccount().then((account: string) => {
			callback(null, account)
		}).catch(err => {
			callback(err)
		})
	})

	socket.on('withdraw', (address: string, amount: number, callback: Function) => {
		this.withdraw(address, amount).then((trasanction: Transaction) => {
			callback(null, trasanction)
		}).catch(err => {
			callback(err)
		})
	})
}