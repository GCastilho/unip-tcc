import axios from 'axios'
import { Nano } from '../index'
import { UpdtSent } from '../../common'
import { PSent } from '../../common/db/models/pendingTx'

export function nanoRpc(this: Nano) {
	const request = async (command: any): Promise<any> => {
		try {
			const res = await axios.post('http://[::1]:55000', command)
			if (res.data.error)
				throw res.data.error
			return res.data
		} catch(err) {
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

	/** @deprecated Não há mais a necessidade de converter unidades */
	const convertToNano = (amount: string): Promise<number> =>
		request({
			action: 'rai_from_raw',
			amount: amount
		}).then(res =>
			parseFloat(res.amount)
		)

	/** @deprecated Não há mais a necessidade de converter unidades */
	const convertToRaw = (amount: string): Promise<string> =>
		request({
			action: 'rai_to_raw',
			amount: amount
		}).then(res =>
			res.amount
		)

	const accountCreate = (): Promise<string> =>
		request({
			action: 'account_create',
			wallet: this.wallet
		}).then(res =>
			res.account
		)

	const blockInfo = (block: string): Promise<any> =>
		request({
			action: 'block_info',
			json_block: 'true',
			hash: block
		})

	const accountInfo = (account: string): Promise<any> =>
		request({
			action: 'account_info',
			account: account
		})

	/**
	 * Executa uma transação na rede da nano
	 * @param doc O documento da transação pendente da collection pendingTx
	 * @returns Um objeto UpdtSended para ser enviado ao servidor
	 */
	const send = async (doc: PSent): Promise<UpdtSent> => {
		const { transaction: { opid, account, amount } } = doc

		// NOTA: doc.amount está em NANO
		const res = await request({
			action: 'send',
			wallet: this.wallet,
			source: this.stdAccount,
			destination: account,
			amount
		}).catch(err => {
			if (err.code = 'ECONNREFUSED') {
				err.code = 'NotSent'
				err.message = 'Connection refused on nano node'
			}
			throw err
		})

		const transaction: UpdtSent = {
			opid,
			txid: res.block,
			status: 'confirmed',
			timestamp: Date.now(), /**@todo Utilizar o timestamp do bloco */
		}

		return transaction
	}

	return {
		request,
		convertToNano,
		convertToRaw,
		accountCreate,
		blockInfo,
		accountInfo,
		send
	}
}
