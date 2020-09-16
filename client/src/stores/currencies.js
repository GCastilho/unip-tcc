import { writable } from 'svelte/store'
import * as auth from '../stores/auth'
import axios from '../utils/axios'

const { subscribe, set } = writable([])

export { subscribe }

auth.subscribe(async () => {
	const { data: currencies } = await axios.get('/v1/currencies')
	set(currencies)
})
