import Common from '../_common'
import * as methods from './methods'

const MAIN_SERVER_IP: string = process.env.MAIN_SERVER_IP || 'localhost'
const MAIN_SERVER_PORT: number = parseInt(process.env.MAIN_SERVER_PORT || '8085')

const wallet = process.env.WALLET
const stdAccount = process.env.SEND_ACCOUNT
if (!wallet) throw 'WALLET needs to be informed as environment variable'
if (!stdAccount) throw 'STANDARD_ACCOUNT needs to be informed as environment variable'

export class Nano extends Common {
	name = 'nano'
	MAIN_SERVER_IP = MAIN_SERVER_IP
	MAIN_SERVER_PORT = MAIN_SERVER_PORT

	protected wallet: string = wallet
	protected stdAccount: string = stdAccount

	protected rpc = methods.nanoRpc.bind(this)()

	processTransaction = methods.processTransaction.bind(this)()

	initBlockchainListener = methods.nanoWebSocket

	createNewAccount = this.rpc.createAccount

	withdraw = this.rpc.send

	constructor() {
		super()
		this.initBlockchainListener()
	}
}
