import { writable } from 'svelte/store'
import axios from '../utils/axios'

const { subscribe, set } = writable([])

export { subscribe }

/**
 * Inicializa a store de currencies
 *
 * Como as currencies não dependem de autenticação, elas serão cacheadas
 * (na memória) pelo sapper, e requests futuros não precisarão acessar a API
 */
axios.get('/v1/currencies')
	.then(res => set(res.data))
	.catch(err => console.error('Error fetching currencies:', err.response.statusText))
