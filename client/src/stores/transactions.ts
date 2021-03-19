import axios from 'axios'
import balances from './balances'
import { ListStore } from '../utils/store'
import currencies from '../utils/currencies'
import { addSocketListener } from '../utils/websocket'
import type { Currencies } from '../routes/currencies'
import type { TxJSON } from '../routes/user/transactions/index'
import type { UpdtReceived, UpdtSent } from '../../../interfaces/transaction'

// See https://github.com/Microsoft/TypeScript/issues/25760
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Transaction = Optional<TxJSON, 'txid'|'timestamp'>

export default new class TransactionsStore extends ListStore<Transaction> {
	constructor() {
		super({
			apiUrl: '/user/transactions',
			userDataStore: true,
			key: 'opid',
		})

		/** Atualiza a store ao receber uma nova transação */
		addSocketListener('new_transaction', (
			currency: keyof Currencies,
			transaction: TxJSON
		) => {
			console.log('new_transaction', transaction)
			this.update(txs => [transaction, ...txs])
			if (transaction.status == 'confirmed') {
				balances.updateBalances(currency, transaction.amount, 0)
			} else {
				balances.updateBalances(currency, 0, transaction.amount)
			}
		})

		/** Atualiza uma transação 'receive' existente na store */
		addSocketListener('update_received_tx', async (
			currency: keyof Currencies,
			txUpdate: UpdtReceived
		) => {
			console.log('update_received_tx', txUpdate)
			this.update(txs => {
				const index = txs.findIndex(tx => tx.opid === txUpdate.opid)
				if (index == -1) {
					this.insertMissingTx(txUpdate.opid)
				} else {
					txs[index] = { ...txs[index], ...txUpdate }
					if (txUpdate.status == 'confirmed')
						balances.updateBalances(currency, txs[index].amount, -txs[index].amount)
				}
				return txs
			})
		})

		/** Atualiza uma transação 'send' existente na store */
		addSocketListener('update_sent_tx', async (
			currency: keyof Currencies,
			updtSent: UpdtSent
		) => {
			console.log('update_sent_tx', updtSent)
			this.update(txs => {
				const index = txs.findIndex(tx => tx.opid === updtSent.opid)
				if (index == -1) {
					this.insertMissingTx(updtSent.opid)
				} else {
					if (updtSent.status == 'cancelled') {
						txs.splice(index, 1)
						balances.updateBalances(currency, txs[index].amount, -txs[index].amount)
					} else {
						// @ts-expect-error TS não está entendendo que cancelled n é possível aq
						txs[index] = { ...txs[index], ...updtSent }
						if (updtSent.status == 'confirmed')
							balances.updateBalances(currency, 0, -txs[index].amount)
					}
				}
				return txs
			})
		})
	}

	/**
	 * Requisita da API e adiciona ao array uma transação que não está
	 * na store de transações
	 * @param opid O opid da transação que não está na store
	 */
	private async insertMissingTx(opid: string) {
		if (typeof opid != 'string')
			throw new TypeError(`opid must be a string, got ${typeof opid}`)

		try {
			const { data } = await axios.get<Transaction>(`${this.apiUrl}/${opid}`)
			if (typeof data != 'object')
				throw new TypeError(`Invalid response type: expected 'object', got ${typeof data}`)
			this.update(txs => {
			// Adiciona a transação na posição correta do array
				const index = txs.findIndex(tx => tx.timestamp < data.timestamp)
				if (index > 0) {
					txs.splice(index, 0, data)
				} else {
					txs.unshift(data)
				}
				return txs
			})
		} catch (err) {
			console.error('Error fetching transaction', err)
		}
	}

	/**
	 * Realiza um request de saque
	 * @param currency A currency que será sacada
	 * @param destination O endereço de destino que as moedas devem ser enviadas
	 * @param amount A quantidade dessa currency que será sacada
	 */
	public async withdraw(
		currency: keyof Currencies,
		destination: string,
		amount: number,
	) {
		const { data } = await axios.post<{ opid: string }>(this.apiUrl, {
			currency,
			destination,
			amount
		})
		console.log('new transaction sent, opid is:', data.opid)

		this.update(txs => ([
			{
				opid: data.opid,
				type: 'send',
				status: 'processing',
				currency,
				account: destination,
				amount,
				fee: currencies[currency].fee
			},
			...txs
		]))

		balances.updateBalances(currency, -amount, amount)
	}

	/**
	 * Cancela uma operação de saque caso ela ainda não tenha sido executada
	 * @param opid O opid da transação que será cancelada
	 */
	public async cancell(opid: string) {
		try {
			const { data } = await axios.delete<{ message: string }>(`${this.apiUrl}/${opid}`)
			if (data.message == 'cancelled') {
				console.log('Transaction', opid, 'cancelled')
				this.update(txs => {
					const index = txs.findIndex(v => v.opid == opid)
					balances.updateBalances(txs[index].currency, txs[index].amount, -txs[index].amount)
					txs.splice(index, 1)
					return txs
				})
			} else {
				console.log('The cancell request returned:', data)
			}
		} catch (err) {
			console.error('Error cancelling transaction', err)
		}
	}
}
