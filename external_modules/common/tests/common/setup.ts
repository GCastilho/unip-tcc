import sinon from 'sinon'
import ss from 'socket.io-stream'
import socketIO from 'socket.io'
import Common from '../../index'

export class WithdrawTestCommon extends Common {
	getNewAccount = sinon.fake.resolves('random-account')
	initBlockchainListener() {
		this.events.emit('rpc_connected')
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
