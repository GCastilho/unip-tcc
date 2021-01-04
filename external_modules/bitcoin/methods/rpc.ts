import Client from 'bitcoin-core'
import { EventEmitter } from 'events'
import type { WithdrawRequest, UpdateSentTx } from '../../common'

/** EventEmmiter genérico */
class Events extends EventEmitter {}

const bitcoinHost = process.env.BITCOIN_HOST || '127.0.0.1'

/**
 * Eventos do rpc da bitcoin, emite dois eventos: 'rpc_success' e 'rpc_refused',
 * o primeiro para qualquer evento bem sucedido, o segundo para quando o erro
 * 'ECONNREFUSED' acontece em um request
 */
export const events = new Events()

/** Cliente para interação com o rpc da bitcoin */
const client = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	host: bitcoinHost,
	port: 40000
})

/**
 * Wrapper de request de comandos rpc da bitcoin, emite um evento 'rpc_success'
 * no rpcEvents ao executar um comando bem sucedido e 'rpc_refused' caso o
 * request retorne 'ECONNREFUSED'
 * @param command O comando do 'client' do bitcoin que será executado
 * @param args Os argumentos do comando que será executado
 */
async function request(command: string, ...args: any[]): Promise<any> {
	try {
		const res = await client[command](...args)
		events.emit('rpc_success')
		return res
	} catch (err) {
		if (err.code === 'ECONNREFUSED') {
			events.emit('rpc_refused')
		}
		throw err
	}
}

const sendToAddress = async (account: string, amount: number): Promise<string> =>
	await request('sendToAddress', account, amount)

export const transactionInfo = async (txid: string): Promise<any> =>
	await request('getTransaction', txid)

export const listSinceBlock = async (block: string): Promise<any> =>
	await request('listSinceBlock', block)

export const blockInfo = async (block): Promise<any> =>
	await request('getBlock', block, 1)

export const getNewAddress = async (): Promise<string> =>
	await request('getNewAddress')

export const getRpcInfo = async (): Promise<any> =>
	await request('getRpcInfo')

export const getBlockChainInfo = async (): Promise<any> =>
	await request('getBlockchainInfo')

export const getBlockCount = async (): Promise<any> =>
	await request('getBlockCount')

/**
 * Executa uma transação na rede da bitcoin
 * @param req As informações do request de saque
 * @returns Um objeto com as informações da transação enviada
 */
export async function send(req: WithdrawRequest): Promise<UpdateSentTx> {
	// TODO: Melhorar o handler desses error codes
	// TODO: Garantir que o cast to number do amount não dá problema com rounding
	const txid = await sendToAddress(req.account, req.amount).catch(err => {
		if (err.code === 'ECONNREFUSED') {
			err.code = 'NotSent'
			err.message = 'Connection refused on bitcoin node'
		} else if (err.code === -6) {
			// Insuficient funds on wallet
			err.code = 'NotSent'
		} else if (err.code === -3) {
			// Invalid amount for send
			err.code = 'NotSent'
		}

		throw err
	})

	const tInfo = await transactionInfo(txid)
	return {
		txid,
		status: 'pending',
		confirmations: 0,
		timestamp: tInfo.time * 1000 // O timestamp do bitcoin é em segundos
	}
}

/**
 * Executa um 'ping' para saber se o bitcoin está online e
 * dar trigger no 'rpc_success' ao iniciar o script
 */
setTimeout(() => {
	getRpcInfo().catch(err => {
		if (err?.code != 'ECONNREFUSED')
			console.error('Error sendig ping to bitcoin', err)
	})
}, 5000)
