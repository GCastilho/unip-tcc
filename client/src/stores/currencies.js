import { writable, get as getStoreValue } from 'svelte/store'
import axios from '../utils/axios'
import { addSocketListener } from '../utils/websocket'

const { subscribe, set } = writable([])

export { subscribe }

/**
 * Inicializa a store de currencies e adiciona um listener para atualizá-la a
 * cada vez que se conectar com o websocket
 *
 * Como as currencies não dependem de autenticação, elas serão cacheadas
 * (na memória) pelo sapper, e requests futuros não precisarão acessar a API
 *
 * @todo A store está vazia qdo ela chega no cliente, mesmo se o HTML dela foi
 * enviado, então ela está sendo setada de novo o que está causando-a dar um
 * flicker (visível ao abrir diretamente na página de balances); Isso pode ser
 * resolvido se a store de sessão puder ser acessada desse módulo e ser
 * utilizada para inicializar essa daqui ou algum outro meio de inicializar
 * essa store no cliente ainda qdo o request está no servidor
 */
axios.get('/v1/currencies')
	.then(res => set(res.data))
	.catch(err => console.error('Error fetching currencies:', err.code))
	.then(() => {
		addSocketListener('connect', async () => {
			try {
				const { data } = await axios.get('/v1/currencies')
				set(data)
			} catch (err) {
				console.error('Error fetching currencies:', err.code)
			}
		})
	})

/**
 * Retorna o objeto de informações de uma currency, o mesmo retornado pela API
 * @param {string} currency A currency para retornar informações
 */
export function get(currency) {
	return getStoreValue({ subscribe }).find(v => v.name == currency)
}
