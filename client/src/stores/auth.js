import { writable, get } from 'svelte/store'
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
 * Referência à store de sessão que o sapper não deixa eu instanciar ela aqui
 *
 * @type {ReturnType<writable<{}>>}
 */
let sessionStore = writable({})

/**
 * Inicializa a store de autenticação no modo SSR
 *
 * @param {ReturnType<writable<{}>>} session A instância da store de sessões
 */
export async function init(session) {
	sessionStore.update(() => get(session))
	set(get(session).loggedIn)

	subscribe(auth => {
		sessionStore.update(v => {
			v.loggedIn = auth
			return v
		})
	})
}

/**
 * Seta a store de autenticação e emite um evento de autenticação com o soket
 * usando o token fornecido. A autenticação com a API é presumida como feita
 * pela função que fizer o init
 *
 * @param {string} token O token de autenticação com o webosocket
 */
async function authentication(token) {
	if (typeof token != 'string') return set(false)

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
 * Loga o usuário na API e no websocket
 * @param {string} email O email do usuário
 * @param {string} password A senha do usuário
 */
export async function login(email, password) {
	try {
		/** @type {{data: {token: string}}} */
		const { data } = await axios.post('/v1/user/authentication', {
			email, password
		})
		await authentication(data.token)
	} catch(err) {
		console.error('Authentication error', err)
		set(false)
	}
}

/**
 * Desloga o usuário da API e com o websocket
 */
export async function logout() {
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
			await authentication(data.token)
		} catch(err) {
			if (!err.response || err.response.status == 401) set(false)
			else throw err
		}
	})
})
