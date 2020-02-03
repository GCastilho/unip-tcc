import { writable } from 'svelte/store'
import { emit } from '../websocket'

// TODO: Salvar o token pela sessão (localstorage, sessionstorage, etc) para possibilitar a reautenticação enquanto o token for válido
// TODO: Mudar pra readable store para não ter que exportar set
const { subscribe, set } = writable(false)
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
	console.log('Deauthentication successful')
	set(false)
}
