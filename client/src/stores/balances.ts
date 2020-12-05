import axios from 'axios'
import { writable } from 'svelte/store'
import currencies from '../utils/currencies'
import * as auth from './auth'
import type { Balances } from '../routes/user/balances'

/** Retorna um objeto com o type da store mas com os saldos zerados */
function emptyStore(): Balances {
	const store = {} as Balances
	for (const currency in currencies) {
		if (Object.prototype.hasOwnProperty.call(currencies, currency)) {
			store[currency] = {
				available: 0,
				locked: 0
			}
		}
	}
	return store
}

const { subscribe, set, update } = writable<Balances>(emptyStore())

/**
 * Exporta a store para permitir modificação do saldo de fora
 */
export { subscribe, set }

/**
 * Ao autenticar com o socket atualiza o saldo com o valor do servidor
 */
auth.subscribe(async authenticated => {
	if (authenticated) {
		try {
			const { data } = await axios.get<Balances>('/user/balances')
			set(data)
		} catch (err) {
			console.error('Error while fetching balances:', err.response?.statusText || err.code)
		}
	} else {
		set(emptyStore())
	}
})

/**
 *
 * @param currency A currency que o saldo será atualizado
 * @param available Quanto o available deve ser incrementado
 * @param locked Quanto o locked deverá ser incrementado
 */
export function updateBalances(
	currency: keyof Balances,
	available: number,
	locked: number,
) {
	update(balances => {
		balances[currency].available += available
		balances[currency].locked += locked
		return balances
	})
}
