import Client from 'bitcoin-core'
import { EventEmitter } from 'events'
import type TypedEmitter from 'typed-emitter'
import type {
	TransactionInfo,
	BlockInfo,
	ListSinceBlock,
	BlockchainInfo,
} from './Bitcoin'

const bitcoinHost = process.env.BITCOIN_HOST || '127.0.0.1'

/**
 * Eventos do rpc da bitcoin, emite dois eventos: 'rpc_connected' e
 * 'rpc_disconnected' quando o RPC da bitcoin e se conecta e perde a conexão.
 *
 * Como a conexão não é contínua, pode ser que demore alguns segundos antes de
 * o sistema detectar que o node se desconectou ou conectou
 */
export const events: TypedEmitter<{
	rpc_connected: () => void
	rpc_disconnected: (reason?: Error) => void
}> = new EventEmitter()

/** Cliente para interação com o rpc da bitcoin */
const client = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	host: bitcoinHost,
	port: 40000
})

/** Flag para saber se o node da bitcoin está disponível ou não */
let isOnline = false

/**
 * Wrapper de request de comandos rpc da bitcoin, emite um evento 'rpc_success'
 * no rpcEvents ao executar um comando bem sucedido e 'rpc_refused' caso o
 * request retorne 'ECONNREFUSED'
 * @param command O comando do 'client' do bitcoin que será executado
 * @param args Os argumentos do comando que será executado
 */
async function call(command: string, ...args: any[]): Promise<any> {
	try {
		const res = await client[command](...args)
		if (!isOnline) {
			isOnline = true
			events.emit('rpc_connected')
		}
		return res
	} catch (err) {
		if (isOnline) {
			isOnline = false
			events.emit('rpc_disconnected')
		}
		throw err
	}
}

/**
 * Envia bitcoins para um address específico
 * @param address A account de destino da transação
 * @param amount O amount que deve ser enviado
 * @returns O txid da transação
 */
export function sendToAddress(address: string, amount: number): Promise<string> {
	try {
		return call('sendToAddress', address, amount)
	} catch (err) {
		// TODO: Melhorar o handler desses error codes
		// (uma classe que pegue err e retorne um objeto conhecido)
		if (err.code === 'ECONNREFUSED') {
			err.code = 'NotSent'
			err.message = 'Connection refused on bitcoin node'
		} else if (err.code === -6) {
			// Insuficient funds on wallet
			err.code = 'NotSent'
		} else if (err.code === -3) {
			err.code = 'NotSent'
			err.message = 'Invalid amount'
		}

		throw err
	}
}

export function getTransactionInfo(txid: string): Promise<TransactionInfo> {
	return call('getTransaction', txid)
}

export function listSinceBlock(block: string): Promise<ListSinceBlock> {
	return call('listSinceBlock', block)
}

export function getBlockInfo(blockhash: string): Promise<BlockInfo> {
	return call('getBlock', blockhash, 1)
}

export function getBlockChainInfo(): Promise<BlockchainInfo> {
	return call('getBlockchainInfo')
}

export function getNewAddress(): Promise<string> {
	return call('getNewAddress')
}

export function getBlockCount(): Promise<number> {
	return call('getBlockCount')
}

export function uptime(): Promise<number> {
	return call('uptime')
}

/**
 * Executa um 'ping' a cada 10s para saber se o bitcoin está online ou não
 */
setInterval(() => {
	uptime().catch(err => {
		if (err?.code != 'ECONNREFUSED')
			console.error('Error sendig ping to bitcoin', err)
	})
}, 10000)
