import io from 'socket.io-client'
import Person from '../../../src/db/models/person'
import Transaction from '../../../src/db/models/transaction'
import type { SuportedCurrencies } from '../../../src/libs/currencies'
import type { ExternalEvents, MainEvents } from '../../../interfaces/communication/external-socket'

/**
 * Cria um usuário no sistema e configura sua conta de bitcoin
 * Só é usado bitcoin nos testes pq todas as instâncias da classe Currency
 * funcionam da mesma maneira, não sendo necessário testar elas individualmente
 */
export async function setupPerson(): Promise<InstanceType<typeof Person>> {
	await Person.deleteMany({})
	await Transaction.deleteMany({})

	const person = await Person.createOne('receival_test@example.com', 'userP@ss')

	// Seta uma dummy account para ser usada nos testes
	person.currencies.bitcoin.accounts.push('bitcoin-account')

	await person.save({ validateBeforeSave: false })

	return person
}

/**
 * Classe wrapper para o socket do cliente (o que se conecta com a currencyApi)
 */
export class Socket {
	private socket: SocketIOClient.Socket

	constructor(currency: SuportedCurrencies) {
		const CURRENCY_API_PORT = process.env.CURRENCY_API_PORT || 5808

		this.socket = io(`http://127.0.0.1:${CURRENCY_API_PORT}/${currency}`)
	}

	public disconnect() {
		return new Promise(res => {
			this.socket.once('disconnect', () => res())
			this.socket.disconnect()
		})
	}

	public emit<Event extends keyof ExternalEvents>(
		event: Event,
		...args: Parameters<ExternalEvents[Event]>
	): Promise<ReturnType<ExternalEvents[Event]>> {
		return new Promise((resolve, reject) => {
			this.socket.emit(event, ...args, ((error, response) => {
				if (error) return reject(error)
				resolve(response)
			}))
		})
	}

	public on<Event extends keyof MainEvents>(
		event: Event,
		fn: (...args: any[]) => void
	): void {
		this.socket.on(event, fn)
	}

	public once<Event extends keyof MainEvents>(
		event: Event,
		fn: (...args: any[]) => void
	): void {
		this.socket.once(event, fn)
	}
}
