import Common from '../common'
import * as rpc from './methods/rpc'
import * as methods from './methods'
import type { WithdrawRequest, WithdrawResponse } from '../common'

export class Nano extends Common {
	protected processTransaction = methods.processTransaction

	findMissingTx = methods.findMissingTx

	initBlockchainListener = methods.nanoWebSocket

	constructor() {
		super({
			name: 'nano',
		})
	}

	async getNewAccount(): Promise<string>{
		const { account } = await rpc.accountCreate()
		return account
	}

	async withdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
		const { account, amount } = request
		const { block } = await rpc.sendNano(account, amount)
		return {
			txid: block,
			status: 'confirmed',
			timestamp: Date.now()
		}
	}
}

const nano = new Nano()
nano.init()
