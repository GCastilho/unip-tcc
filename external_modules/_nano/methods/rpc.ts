import rpc from 'node-json-rpc'
import Account from '../../_common/db/models/account'
import { Transaction } from '../../_common'
import { Nano } from '../index'

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
	
	const convertToNano = (amount: string): Promise<string> =>
		rpcCommand({
			action: 'rai_from_raw',
			amount: amount
		}).then(res =>
			res.amount
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

	const send = (destination: string , nanoAmount: number): Promise<Transaction> =>
		convertToRaw(nanoAmount.toString()).then(amount =>
			rpcCommand({
				action: 'send',
				wallet: this.wallet,
				source: this.stdAccount,
				destination: destination,
				amount: amount
			})
		).then(res => {
			const transaction: Transaction = {
				txid: res.block,
				timestamp: Date.now(), /**@todo Utilizar o timestamp do bloco */
				account: destination,
				amount: nanoAmount
			}
			console.log('sended new transction:', transaction)
			return transaction
		})

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
