import axios from 'axios'
import { fromNanoToRaw } from '../utils/unitConverter'

const nanoUrl = process.env.NANO_URL || 'http://[::1]:55000'
const wallet = process.env.WALLET as string
export const stdAccount = process.env.SEND_ACCOUNT as string

if (!wallet) throw 'WALLET needs to be informed as environment variable'
if (!stdAccount) throw 'STANDARD_ACCOUNT needs to be informed as environment variable'

async function call<T = any>(command: any): Promise<T> {
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

export async function accountCreate() {
	return call<Nano.AccountCreate>({
		action: 'account_create',
		wallet
	})
}

export async function blockInfo(block: string){
	return call<Nano.BlockInfo>({
		action: 'block_info',
		json_block: 'true',
		hash: block
	})
}

export async function accountInfo(account: string) {
	return call<Nano.AccountInfo>({
		action: 'account_info',
		account
	})
}

async function send(source: string, destination: string, rawAmount: string) {
	try {
		return call<Nano.SendRespone>({
			action: 'send',
			wallet,
			source,
			destination,
			amount: rawAmount,
		})
	} catch (err) {
		if (err.code === 'ECONNREFUSED') {
			/** @todo Ser instância de um Error */
			throw {
				code: 'NotSent',
				message: 'Connection refused on nano node',
				details: err,
			}
		} else throw err
	}
}

export async function sendRaw(account: string, amount: number|string) {
	return send(stdAccount, account, fromNanoToRaw(`${amount}`))
}

export async function sendToStd(source: string, amount: number|string){
	return send(source, stdAccount, fromNanoToRaw(`${amount}`))
}
