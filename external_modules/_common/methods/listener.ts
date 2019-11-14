import Common from '../index'
import Account from '../db/models/account'
const ss = require('socket.io-stream')
import { Transaction } from '../index'

/**
 * Essa função é o handler de requests vindos do servidor principal
 */
export function listener(this: Common) {
	this.socket.on('connect', async () => {
		console.log(`Connected to the main server`)

		process.stdout.write(`Requesting ${this.name} accounts...`)
		const stream: NodeJS.ReadableStream = ss.createStream()
		this.socket.emit('get_account_list', stream)

		stream.once('data', () => {
			console.log('Success\nReceiving and importing accounts into the database')
		})
		
		stream.on('data', (chunk) => {
			/** Cada chunk é uma account */
			Account.updateOne({
				account: chunk.toString(),
			}, {}, {
				upsert: true
			})
		})

		stream.on('end', () => {
			console.log(`All accounts received and imported successfuly!`)
		})
	})

	this.socket.on('disconnect', () => {
		console.log(`Disconnected from the main server`)
	})

	this.socket.on('create_new_account', (callback: Function) => {
		this.createNewAccount().then((account: string) => {
			callback(null, account)
		}).catch(err => {
			callback(err)
		})
	})

	this.socket.on('withdraw', (address: string, amount: number, callback: Function) => {
		this.withdraw(address, amount).then((trasanction: Transaction) => {
			callback(null, trasanction)
		}).catch(err => {
			callback(err)
		})
	})
}
