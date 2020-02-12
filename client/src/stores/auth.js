import { writable } from 'svelte/store'
import { emit } from '../websocket'

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
 * 
 * @todo Como o sistema de autenticação não retorna um sucesso, essa função
 * irá sempre presumir que a autenticação foi bem sucedida até que o sistema
 * de autenticação seja refeito
 */
export async function authenticate(token) {
	emit('authentication', token)
	localStorage.setItem('socket-auth-token', token)
	console.log('Authentication successful')
	set(true)
}

/**
 * Desautentica uma conexão com o websocket
 * 
 * @todo Como o sistema de autenticação não retorna um sucesso, essa função
 * irá sempre presumir que a desautenticação foi bem sucedida até que o sistema
 * de autenticação seja refeito
 */
export async function deauthenticate() {
	emit('authentication')
	localStorage.removeItem('socket-auth-token')
	console.log('Deauthentication successful')
	set(false)
}
