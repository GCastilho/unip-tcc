import sinon from 'sinon'
import socketIO from 'socket.io'
import io from 'socket.io-client'
import ss from 'socket.io-stream'
import Common from '../../index'
import initListeners from '../../listeners'
import type { Socket } from 'socket.io-client'

// @ts-expect-error Mocking o connectToMainServer para permitir disconnect
export class WithdrawTestCommon extends Common {
	private _socket: typeof Socket

	getNewAccount = sinon.fake.resolves('random-account')
	initBlockchainListener() {
		this.events.emit('rpc_connected')
	}

	/** Conecta com o servidor principal */
	connectToMainServer() {
		/** Socket de conexão com o servidor principal */
		const socket = io(`http://localhost:5808/${this.name}`)
		this._socket = socket
		initListeners.call(this, socket)
	}

	public close() {
		this._socket.close()
	}

	withdraw = sinon.fake(() => {
		return Promise.resolve({
			txid: `random-txid-${Math.random()}`,
			status: 'pending',
			confirmations: 2,
			timestamp: Date.now(),
		})
	})
}

export class WithdrawManyTestCommon extends WithdrawTestCommon {
	withdrawMany() {
		return Promise.resolve({
			txid: `random-txid-many-${Math.random()}`,
			status: 'pending' as const,
			confirmations: 1,
			timestamp: Date.now(),
		})
	}
}

const port = process.env.MAIN_SERVER_PORT || 5808

export function mockedCurrencyApi(currency: string) {
	const io = socketIO(port)

	io.of(currency).on('connection', socket => {
		/**
		 * Mock da stream de strings de todas as accounts dos clientes
		 */
		ss(socket).on('get_account_list', (stream: NodeJS.WritableStream) => {
			stream.end()
		})
	})

	return io
}
