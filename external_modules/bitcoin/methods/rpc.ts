import Client from 'bitcoin-core'
import { EventEmitter } from 'events'
import { UpdtSent } from '../../common'
import { PSent } from '../../common/db/models/pendingTx'

/** EventEmmiter genérico */
class Events extends EventEmitter {}

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
	} catch(err) {
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
	await request('getBlock', block)

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
 * @param pSend O documento da transação pendente da collection pendingTx
 * @returns Um objeto UpdtSended para ser enviado ao main server
 */
export async function send(pSend: PSent): Promise<UpdtSent> {
	const { transaction: { opid, account, amount } } = pSend

	// TODO: Melhorar o handler desses error codes
	// TODO: Garantir que o cast to number do amount não dá problema com rounding
	const txid = await sendToAddress(account, +amount).catch(err => {
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
	const transaction: UpdtSent = {
		opid,
		txid,
		status: 'pending',
		confirmations: 0,
		timestamp: tInfo.time * 1000 // O timestamp do bitcoin é em segundos
	}
	console.log('sent new transaction', transaction)

	return transaction
}

/**
 * Executa um 'ping' para saber se o bitcoin está online e
 * dar trigger no 'rpc_success' ao iniciar o script
 */
setTimeout(() => {
	getRpcInfo().catch(err => {
		if (err !== 'ECONNREFUSED')
			console.error('Error sendig ping to bitcoin', err)
	})
}, 5000)
