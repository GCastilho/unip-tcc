import rpc from 'node-json-rpc'
import { UpdtSended } from '../../common'
import { Nano } from '../index'
import { PSended } from '../../common/db/models/pendingTx'

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

	/** @deprecated Não há mais a necessidade de converter unidades */
	const convertToNano = (amount: string): Promise<number> =>
		rpcCommand({
			action: 'rai_from_raw',
			amount: amount
		}).then(res =>
			parseFloat(res.amount)
		)

	/** @deprecated Não há mais a necessidade de converter unidades */
	const convertToRaw = (amount: string): Promise<string> =>
		rpcCommand({
			action: 'rai_to_raw',
			amount: amount
		}).then(res =>
			res.amount
		)

	const accountCreate = (): Promise<string> =>
		rpcCommand({
			action: 'account_create',
			wallet: this.wallet
		}).then(res =>
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

	/**
	 * Executa uma transação na rede da nano
	 * @param doc O documento da transação pendente da collection pendingTx
	 * @returns Um objeto UpdtSended para ser enviado ao servidor
	 */
	const send = async (doc: PSended): Promise<UpdtSended> => {
		const { transaction: { opid, account, amount } } = doc

		const res = await rpcCommand({
			action: 'send',
			wallet: this.wallet,
			source: this.stdAccount,
			destination: account,
			amount: amount.toLocaleString('fullwide', { useGrouping: false })
		})

		const transaction: UpdtSended = {
			opid,
			txid: res.block,
			status: 'confirmed',
			timestamp: Date.now(), /**@todo Utilizar o timestamp do bloco */
		}

		return transaction
	}

	return {
		command: rpcCommand,
		convertToNano,
		convertToRaw,
		accountCreate,
		blockInfo,
		accountInfo,
		send
	}
}
