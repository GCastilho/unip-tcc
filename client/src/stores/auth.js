import { writable } from 'svelte/store'
import axios from '../utils/axios'
import { emit, addSocketListener } from '../utils/websocket'

/**
 * Store que armazena se o cliente está autenticado ou não
 */
const { subscribe, set } = writable(false)

/**
 * Exporta o subscribe para esse módulo ser uma store
 */
export { subscribe }

/**
 * Seta a store de autenticação e emite um evento de autenticação com o soket
 * usando o token fornecido. A autenticação com a API é presumida como feita
 * pela função que fizer o init
 *
 * @param {string} token O token de autenticação com o webosocket
 */
export async function init(token) {
	if (typeof token != 'string') return
	try {
		await emit('authenticate', token)
		console.log('Authentication successful')
		set(true)
	} catch(err) {
		if (err != 'InvalidToken')
			console.error('Error authenticating with websocket', err)
	}
}

/**
 * Autentica o usuário na API e no websocket
 * @param {string} email O email do usuário
 * @param {string} password A senha do usuário
 */
export async function authenticate(email, password) {
	try {
		/** @type {{data: {token: string}}} */
		const { data } = await axios.post('/v1/user/authentication', {
			email, password
		})
		await init(data.token)
	} catch(err) {
		console.error('Authentication error', err)
		set(false)
	}
}

/**
 * Desautentica uma conexão com a API e com o websocket
 */
export async function deauthenticate() {
	try {
		await axios.delete('/v1/user/authentication')
		emit('deauthenticate')
		console.log('Deauthentication successful')
		set(false)
	} catch(err) {
		console.error('Deauthentication error:', err)
		set(false)
	}
}

/**
 * Adiciona um listener de connect no socket quando ele desconectar da primeira
 * vez, para que ele cheque pela autenticação a cada vez que ele se conectar
 *
 * Se o listener for colocado diretamente ele fará um check em seguida, e
 * já que a preload do _layout principal já inicializa a store, isso causa
 * uma requisição duplicada na API
 */
const removeListener = addSocketListener('disconnect', () => {
	/**
	 * Remove o listener para evitar que vários listeners de connect sejam
	 * colocados a cada disconnect
	 */
	removeListener()

	/**
	 * Tenta inicializar a store assim que conectado
	 */
	addSocketListener('connect', async () => {
		try {
			/** @type {{data: {token: string}}} */
			const { data } = await axios.get('/v1/user/authentication')
			await init(data.token)
		} catch(err) {
			if (!err.response || err.response.status == 401) set(false)
			else throw err
		}
	})
})
