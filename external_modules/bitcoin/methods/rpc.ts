const Client = require('bitcoin-core')
import Account from '../../common/db/models/account'
import { TxSend } from '../../common'
import { PTx } from '../../common/db/models/pendingTx'

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
	
	const send = async (PTx: PTx): Promise<TxSend> => {
		const { send: { opid, account, amount } } = PTx
		const txid: string = await wallet.sendToAddress(account, amount)
		const tInfo = await transactionInfo(txid)

		PTx.send.txid = txid
		await PTx.save()

		const transaction: TxSend = {
			opid,
			txid,
			type: 'send',
			status: 'pending',
			confirmations: 0,
			amount,
			account,
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
