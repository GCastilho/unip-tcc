import axios from 'axios'
import { writable } from 'svelte/store'
import * as auth from '../../../stores/auth'
import currencies from '../../../utils/currencies'
import type { Accounts } from '../../user/accounts'

/** Retorna um objeto com o type da store mas com as accounts vazias */
function emptyStore(): Accounts {
	const store = {} as Accounts
	for (const currency in currencies) {
		if (Object.prototype.hasOwnProperty.call(currencies, currency)) {
			store[currency] = []
		}
	}
	return store
}

const { subscribe, set } = writable<Accounts>(emptyStore())

/** Export o subscribe para este módulo ser um store */
export { subscribe }

auth.subscribe(async authenticated => {
	if (authenticated) {
		try {
			const { data } = await axios.get<Accounts>('/user/accounts')
			set(data)
		} catch (err) {
			if (!err.response || err.response?.status == 401) set(emptyStore())
			else throw err
		}
	} else {
		set(emptyStore())
	}
})
