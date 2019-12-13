const Client = require('bitcoin-core')
import Account from '../../common/db/models/account'
import { UpdtSended } from '../../common'
import { PSended } from '../../common/db/models/pendingTx'

const client = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	port: 40000
})

export function rpc() {
	const createAccount = async () => {
		const address: string = await client.getNewAddress()
		await new Account({
			account: address
		}).save()
	
		return address
	}

	const transactionInfo = async (txid: string): Promise<any> =>
		await client.getTransaction(txid)

	const blockInfo = async block => await client.getBlock(block)
	
	/**
	 * Executa uma transação na rede da bitcoin
	 * @param pSend O documento da transação pendente da collection pendingTx
	 * @returns Um objeto UpdtSended para ser enviado ao servidor
	 */
	const send = async (pSend: PSended): Promise<UpdtSended> => {
		const { transaction: { opid, account, amount } } = pSend
		let txid: string
		try {
			txid = await client.sendToAddress(account, amount)
		} catch (err) {
			if (err.code === 'ECONNREFUSED') {
				const port = err.port
				const address = err.address
				err = {
					code: 'NotSended',
					message: 'Connection refused on bitcoin node',
					address,
					port
				}
			}
			throw err
		}
		const tInfo = await transactionInfo(txid)
		
		const transaction: UpdtSended = {
			opid,
			txid,
			status: 'pending',
			confirmations: 0,
			timestamp: tInfo.time*1000 // O timestamp do bitcoin é em segundos
		}
		console.log('sended new transaction', transaction)

		return transaction
	}
	
	return {
		createAccount,
		transactionInfo,
		blockInfo,
		send
	}
}
