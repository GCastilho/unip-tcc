import Account from '../../common/db/models/account'
import { getTransactionInfo } from './rpc'
import type { Bitcoin } from '../index'
import type { NewTransaction } from '../../common'

/**
 * @todo Uma maneira de pegar transacções de quado o servidor estava off
 * @todo Adicionar um handler de tx cancelada (o txid muda se aumentar o fee)
 */
export async function processTransaction(this: Bitcoin, txid: NewTransaction['txid']) {
	if (typeof txid != 'string') return

	try {
		const txInfo = await getTransactionInfo(txid)

		const transactions: NewTransaction[] = txInfo.details
			.filter(tx => tx.category == 'receive')
			.map(details => {
				const { address, amount } = details
				return {
					amount,
					txid:          txInfo.txid,
					account:       address,
					status:        txInfo.confirmations < 3 ? 'pending' : 'confirmed',
					confirmations: txInfo.confirmations,
					timestamp:     txInfo.time * 1000 // O timestamp do bitcoin é em segundos
				}
			})

		const accounts = await Account.find({
			account: { $in: transactions.map(d => d.account) }
		}).map(docs => docs.map(doc => doc.account)).orFail()

		for (const tx of transactions.filter(tx => accounts.includes(tx.account))) {
			/**
			 * O evento de transação recebida acontece quando a transação é
			 * recebida e quando ela recebe a primeira confimação, o que causa um
			 * erro 11000
			 */
			await this.newTransaction(tx).catch(err => {
				if (err.code != 11000) throw err
			})
		}
	} catch (err) {
		console.error('Transaction processing error:', err)
	}
}
