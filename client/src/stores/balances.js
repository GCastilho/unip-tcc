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
	if (!auth || typeof window == 'undefined') return
	try {
		const { data } = await axios.get('/v1/user/balances')
		for (const currency in data) {
			for (const key in data[currency]) {
				data[currency][key] = +data[currency][key]
			}
		}
		set(data)
	} catch (err) {
		console.error('Error while fetching balances:', err.response.statusText)
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
