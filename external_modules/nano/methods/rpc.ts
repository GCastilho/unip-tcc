import rpc from 'node-json-rpc'
import Account from '../../common/db/models/account'
import { TxSend } from '../../common'
import { Nano } from '../index'
import { PTx } from '../../common/db/models/pendingTx'

export function nanoRpc(this: Nano) {
	const client = new rpc.Client({
		port: 55000,
		host: '::1',
		path: '/',
		strict: false // turn rpc checks off, default true
	})

	const rpcCommand = (command: any): Promise<any> =>
		new Promise((resolve, reject) => {
			client.call(command, (err, res) => {
				if (!err && !res.error) {
					resolve(res)
				} else {
					const error = err ? err : res.error
					console.error(error)
					reject(error)
				}
			})
		})
	
	const convertToNano = (amount: string): Promise<number> =>
		rpcCommand({
			action: 'rai_from_raw',
			amount: amount
		}).then(res =>
			parseFloat(res.amount)
		)
	
	const convertToRaw = (amount: string): Promise<string> =>
		rpcCommand({
			action: 'rai_to_raw',
			amount: amount
		}).then(res =>
			res.amount
		)

	const createAccount = (): Promise<string> =>
		rpcCommand({
			action: 'account_create',
			wallet: this.wallet
		}).then(res =>
			new Account({
				account: res.account
			}).save()
		).then(res =>
			res.account
		)
	
	const blockInfo = (block: string): Promise<any> =>
		rpcCommand({
			action: 'block_info',
			json_block: 'true',
			hash: block
		})

	const accountInfo = (account: string): Promise<any> =>
		rpcCommand({
			action: 'account_info',
			account: account
		})

	const send = async (pTx: PTx): Promise<TxSend> => {
		const { send: { opid, account } } = pTx
		const nanoAmount = await convertToRaw(pTx.send.amount.toString())
		const res = await rpcCommand({
			action: 'send',
			wallet: this.wallet,
			source: this.stdAccount,
			destination: account,
			amount: nanoAmount
		})
		const transaction: TxSend = {
			opid,
			txid: res.block,
			type: 'send',
			status: 'confirmed',
			timestamp: Date.now(), /**@todo Utilizar o timestamp do bloco */
			account,
			amount: parseFloat(nanoAmount)
		}

		return transaction
	}

	return {
		command: rpcCommand,
		convertToNano,
		convertToRaw,
		createAccount,
		blockInfo,
		accountInfo,
		send
	}
}
