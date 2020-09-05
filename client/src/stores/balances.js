import { writable } from 'svelte/store'
import axios from '../utils/axios'
import * as auth from './auth'

const { subscribe, set, update } = writable({})

/**
 * Exporta a store para permitir modificação do saldo de fora
 */
export { subscribe, set }

/**
 * Ao autenticar com o socket atualiza o saldo com o valor do servidor
 */
auth.subscribe(async auth => {
	if (!auth) return
	try {
		const balanceObj = await axios.get('/v1/user/balances')
		const balances = {}
		for (const balance of Object.entries(balanceObj.data)) {
			balances[balance[0]] = {
				available: +balance[1].available,
				locked: +balance[1].locked
			}
		}
		set(balances)
	} catch(err) {
		console.error('Error while fetching balances:', err)
	}
})

/**
 *
 * @param {string} currency A currency que o saldo será atualizado
 * @param {number} available Quanto o available deve ser incrementado
 * @param {number} locked Quanto o locked deverá ser incrementado
 */
export function updateBalances(currency, available, locked) {
	update(balances => {
		balances[currency].available += available
		balances[currency].locked += locked
		return balances
	})
}
