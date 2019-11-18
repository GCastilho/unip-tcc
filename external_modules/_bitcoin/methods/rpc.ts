const Client = require('bitcoin-core')
import Account from '../../_common/db/models/account'
import { Transaction as Tx } from '../../_common'

const wallet = new Client({
	network: 'testnet',
	username: 'exchange',
	password: 'password',
	port: 40000
})

export function rpc() {
	const createAccount = async () => {
		const address: Tx['account'] = await wallet.getNewAddress()
		await new Account({
			account: address
		}).save()
	
		return address
	}

	const transactionInfo = async (txid: Tx['txid']): Promise<any> =>
		wallet.getTransaction(txid)
	
	const blockInfo = async block => wallet.getBlock(block)
	
	const send = async (account: Tx['account'], amount: Tx['amount']): Promise<Tx> => {
		const txid: Tx['txid'] = await wallet.sendToAddress(account, amount)
		const tInfo = await transactionInfo(txid)
		return {
			txid,
			amount,
			account,
			timestamp: tInfo.time
		}
	}
	
	return {
		createAccount,
		transactionInfo,
		blockInfo,
		send
	}
}

