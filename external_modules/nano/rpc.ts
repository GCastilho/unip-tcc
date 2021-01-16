import axios from 'axios'
import { fromNanoToRaw } from './utils/unitConverter'

export type WebSocketMessage = {
	topic: string
	time: string
	message: {
		account: string
		amount: string
		hash: string
		confirmation_type: string
		election_info: {
			duration: string
			time: string
			tally: string
			request_count: string
			blocks: string
			voters : string
		}
		block: {
			type: string
			account: string
			previous: string
			representative: string
			balance: string
			link: string
			link_as_account: string
			signature: string
			work: string
			subtype: string
		}
	}
}

type AccountInfo = {
	frontier: string
	open_block: string
	representative_block: string
	balance: string
	modified_timestamp: string
	block_count: string
	confirmation_height : string
	confirmation_height_frontier : string
	account_version: string
}

type BlockInfo = {
	block_account: string
	amount: string
	balance: string
	height: string
	local_timestamp: string
	confirmed: string
	contents: {
		type: string
		account: string
		previous: string
		representative: string
		balance: string
		link: string
		link_as_account: string
		signature: string
		work: string
	}
	subtype: 'send'|'receive'|'change'|'epoch'
}

type SendRespone = {
	block: string
}

type AccountCreate = {
	account: string
}

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
	return call<AccountCreate>({
		action: 'account_create',
		wallet
	})
}

export async function blockInfo(block: string){
	return call<BlockInfo>({
		action: 'block_info',
		json_block: 'true',
		hash: block
	})
}

export async function accountInfo(account: string) {
	return call<AccountInfo>({
		action: 'account_info',
		account
	})
}

async function send(source: string, destination: string, rawAmount: string) {
	try {
		return call<SendRespone>({
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

export async function sendNano(account: string, amount: number|string) {
	return send(stdAccount, account, fromNanoToRaw(`${amount}`))
}

export async function sendToStd(source: string, amount: number|string){
	return send(source, stdAccount, fromNanoToRaw(`${amount}`))
}
