import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import axios from '../utils/axios'

const { subscribe, set, update } = writable({})

export { subscribe, set, update }

auth.subscribe(async auth => {
	if (!auth) return
	const accounts = await axios.get('/v1/user/accounts')
	const currenciesDetailed = await axios.get('/v1/currencies')

	set(currenciesDetailed.data.map(currency => ({
		name:     currency.name,
		code:     currency.code,
		fee:      currency.fee,
		decimals: currency.decimals,
		accounts: accounts.data[currency.name]
	})))
})
