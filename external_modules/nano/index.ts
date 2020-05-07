import Common from '../common'
import * as methods from './methods'

const MAIN_SERVER_IP: string = process.env.MAIN_SERVER_IP || 'localhost'
const MAIN_SERVER_PORT: number = parseInt(process.env.MAIN_SERVER_PORT || '8085')

const wallet = process.env.WALLET
const stdAccount = process.env.SEND_ACCOUNT
if (!wallet) throw 'WALLET needs to be informed as environment variable'
if (!stdAccount) throw 'STANDARD_ACCOUNT needs to be informed as environment variable'

export class Nano extends Common {
	name = 'nano'
	mainServerIp = MAIN_SERVER_IP
	mainServerPort = MAIN_SERVER_PORT

	protected wallet: string
	protected stdAccount: string

	protected rpc = methods.nanoRpc.bind(this)()

	processTransaction = methods.processTransaction

	findMissingTx = methods.findMissingTx

	initBlockchainListener = async () => {methods.nanoWebSocket}

	getNewAccount = this.rpc.accountCreate

	withdraw = this.rpc.send

	constructor(wallet: string, stdAccount: string) {
		super()
		this.wallet = wallet
		this.stdAccount = stdAccount
	}
}

const nano = new Nano(wallet, stdAccount)
nano.init()
