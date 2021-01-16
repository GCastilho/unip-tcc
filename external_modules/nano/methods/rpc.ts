import axios from 'axios'
import { Nano } from '../index'
import { fromNanoToRaw } from '../utils/unitConverter'
import type { WithdrawRequest, WithdrawResponse } from '../../common'

const nanoUrl = process.env.NANO_URL || 'http://[::1]:55000'

export function nanoRpc(this: Nano) {
	const request = async (command: any): Promise<any> => {
		try {
			const res = await axios.post(nanoUrl, command)
			if (res.data.error)
				throw res.data.error
			return res.data
		} catch (err) {
			if (err.isAxiosError) {
				throw {
					errno:        err.errno,
					code:         err.code,
					syscall:      err.syscall,
					address:      err.address,
					port:         err.port,
					url:          err.config.url,
					isAxiosError: err.isAxiosError
				}
			} else throw err
		}
	}

	const accountCreate = (): Promise<string> =>
		request({
			action: 'account_create',
			wallet: this.wallet
		}).then(res =>
			res.account
		)

	const blockInfo = (block: string): Promise<Nano.BlockInfo> =>
		request({
			action: 'block_info',
			json_block: 'true',
			hash: block
		})

	const accountInfo = (account: string): Promise<Nano.AccountInfo> =>
		request({
			action: 'account_info',
			account: account
		})

	/**
	 * Executa uma transação na rede da nano
	 * @param req As informações do request de saque
	 * @returns Um objeto com as informações da transação enviada
	 */
	const send = async (req: WithdrawRequest): Promise<WithdrawResponse> => {
		const res = await request({
			action: 'send',
			wallet: this.wallet,
			source: this.stdAccount,
			destination: req.account,
			amount: fromNanoToRaw(String(req.amount))
		}).catch(err => {
			if (err.code === 'ECONNREFUSED') {
				err.code = 'NotSent'
				err.message = 'Connection refused on nano node'
			}
			throw err
		})

		return {
			txid: res.block,
			status: 'confirmed',
			timestamp: Date.now(), /**@todo Utilizar o timestamp do bloco */
		}
	}

	return {
		request,
		accountCreate,
		blockInfo,
		accountInfo,
		send
	}
}
