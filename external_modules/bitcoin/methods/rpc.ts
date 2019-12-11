const Client = require('bitcoin-core')
import Account from '../../common/db/models/account'
import { UpdtSended } from '../../common'
import { PSended } from '../../common/db/models/pendingTx'

const wallet = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	port: 40000
})

export function rpc() {
	const createAccount = async () => {
		const address: string = await wallet.getNewAddress()
		await new Account({
			account: address
		}).save()
	
		return address
	}

	const transactionInfo = async (txid: string): Promise<any> =>
		wallet.getTransaction(txid)

	const blockInfo = async block => wallet.getBlock(block)
	
	/**
	 * Executa uma transação na rede da bitcoin
	 * @param pSend O documento da transação pendente da collection pendingTx
	 * @returns Um objeto UpdtSended para ser enviado ao servidor
	 */
	const send = async (pSend: PSended): Promise<UpdtSended> => {
		const { transaction: { opid, account, amount } } = pSend
		const txid: string = await wallet.sendToAddress(account, amount)
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
