import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import { emit, addSocketListener } from '../websocket'

const { subscribe, set, update } = writable({})

/**
 * Exporta a store para permitir modificação do saldo de fora
 */
export { subscribe, set, update }

/**
 * Ao autenticar com o socket atualiza o saldo com o valor do servidor
 */
auth.subscribe(async auth => {
	if (!auth) return
	try {
		const balances = await emit('fetch_balances')
		set(balances)
	} catch(err) {
		console.error('Error while fething balances:', err)
	}
})

/**
 * Atualiza o Balance Locked ao receber uma nova transaction
 */
addSocketListener('new_transaction', (currency, transaction) => {
	update(balances => {
		let { available, locked } = balances[currency]
		locked += transaction.amount
		balances[currency] = { available, locked }
		return balances
	})
})

/**
 * Após receber a confirmação da transação ele atualiza o Balance Available
 */
addSocketListener('update_received_tx', async (currency, txUpdate) => {
	console.log(txUpdate)
	if (txUpdate.status === 'confirmed') {
		try {
			/** Pega os dados da transação pelo opid */
			const opidInfo = await emit('get_opid_info', txUpdate.opid)
			console.log(opidInfo)
			/** Usa dados do amount pego no 'opidInfo' para atualizar o saldo na tela */
			update(balances => {
				let { available, locked } = balances[currency]
				available += opidInfo.amount
				locked -= opidInfo.amount
				balances[currency] = { available, locked }
				return balances
			})
		} catch {
			console.error('Error while getting opid info:', err)
		}
	}
})