import Store from '../utils/store'
import currencies from '../utils/currencies'
import type { Writable } from 'svelte/store'
import type { Balances as ApiBalances } from '../routes/user/balances'

type Balances = {
	[P in keyof ApiBalances]: Partial<ApiBalances[P]>
}

function storeResetter() {
	const store = {} as Balances
	for (const currency in currencies) {
		if (Object.prototype.hasOwnProperty.call(currencies, currency)) {
			store[currency] = {
				available: null,
				locked: null
			}
		}
	}
	return store
}

export default new class BalancesStore extends Store<Balances> {
	constructor() {
		super({
			apiUrl: '/user/balances',
			resetter: storeResetter,
			userDataStore: true,
		})
	}

	// Faz o método set ser público
	public set: Writable<Balances>['set']

	/**
	 * Atualiza o saldo do usuário nos valores informados
	 * @param currency A currency que o saldo será atualizado
	 * @param available Quanto o available deve ser incrementado
	 * @param locked Quanto o locked deverá ser incrementado
	 */
	public updateBalances(
		currency: keyof Balances,
		available: number,
		locked: number,
	) {
		this.update(balances => {
			balances[currency].available += available
			balances[currency].locked += locked
			return balances
		})
	}
}
