import Common from '../_common'
import * as methods from './methods'
const MAIN_SERVER_IP: string = process.env.MAIN_SERVER_IP || 'localhost'
const MAIN_SERVER_PORT: number = parseInt(process.env.MAIN_SERVER_PORT || '8085')

export class Nano extends Common {
	name = 'nano'
	MAIN_SERVER_IP = MAIN_SERVER_IP
	MAIN_SERVER_PORT = MAIN_SERVER_PORT

	protected rpc = methods.nanoRpc()

	initBlockchainListener = methods.nanoWebSocket

	createNewAccount = this.rpc.createAccount

	withdraw = this.rpc.send

	processTransaction = methods.processTransaction.bind(this)()

	constructor() {
		super()
		this.initBlockchainListener()
	}
}
