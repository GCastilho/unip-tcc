import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import axios from '../utils/axios'

const { subscribe, set } = writable({})

/** Export o subscribe para este módulo ser um store */
export { subscribe }

auth.subscribe(async auth => {
	if (!auth) return set({})

	try {
		const { data: accounts } = await axios.get('/v1/user/accounts')
		set(accounts)
	} catch (err) {
		if (!err.response || err.response.status == 401) set({})
		else throw err
	}
})
