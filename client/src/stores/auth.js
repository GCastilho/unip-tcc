import { writable } from 'svelte/store'
import { emit, socket } from '../websocket'

/**
 * Tenta autenticar o socket assim que conectado
 */
socket.on('connect', () => {
	const token = localStorage.getItem('socket-auth-token')
	if (typeof token === 'string') authenticate(token)
})

/**
 * Store que armazena se o socket está autenticado ou não
 */
const { subscribe, set } = writable(false)

/**
 * Caso exista um token salvo, presume que está autenticado (mesmo que
 * desconectado) até o socket emitir um evento de falha de conexão ou de
 * autenticação
 */
if (typeof window !== 'undefined' && window.localStorage) {
	if (localStorage.getItem('socket-auth-token')) set(true)
}

/**
 * Ao usar a store como $auth, o compilador reclama que o método 'set' não
 * existe. Isso é resolvível usando uma readable ou derived, que é uma melhor
 * alternativa do que deixar como está
 */
export { subscribe, set }

/**
 * Autentica uma conexão com o websocket usando o token fornecido
 * @param {string} token O token de autenticação com o websocket
 */
export async function authenticate(token) {
	try {
		await emit('authenticate', token)
		localStorage.setItem('socket-auth-token', token)
		console.log('Authentication successful')
		set(true)
	} catch(err) {
		console.error('autentication error', err)
		set(false)
	}
}

/**
 * Desautentica uma conexão com o websocket
 */
export async function deauthenticate() {
	try {
		await emit('deauthenticate')
		localStorage.removeItem('socket-auth-token')
		console.log('Deauthentication successful')
		set(false)
	} catch(err) {
		console.error('Deauthentication error:', err)
		set(false)
	}
}
