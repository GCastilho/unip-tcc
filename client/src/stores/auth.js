import { writable } from 'svelte/store'
import { emit, addSocketListener } from '../utils/websocket'

/**
 * Função helper para retornar o token do localStorage
 * 
 * @returns {string} o item 'socket-auth-token' do localStorage
 */
const getToken = () => localStorage.getItem('socket-auth-token')

/**
 * Função helper para armazenar o token 'socket-auth-token' no localStorage
 * 
 * @param {string} token O valor token 'socket-auth-token' para ser armazenado
 * no localStorage
 */
const setToken = token => localStorage.setItem('socket-auth-token', token)

/**
 * Função helper para remover o token 'socket-auth-token' do localStorage
 */
const removeToken = () => localStorage.removeItem('socket-auth-token')

/**
 * Caso exista um token salvo, presume que está autenticado (mesmo que
 * desconectado) até o socket emitir um evento de falha de conexão ou de
 * autenticação
 * 
 * @type {boolean} Indica se deve presumir autenticado ou não na inicialização
 */
const initialState = typeof window !== 'undefined'
	&& window.localStorage
	&& !!getToken()

/**
 * Store que armazena se o socket está autenticado ou não
 */
const { subscribe, set } = writable(initialState)

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
		setToken(token)
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
		removeToken()
		console.log('Deauthentication successful')
		set(false)
	} catch(err) {
		console.error('Deauthentication error:', err)
		set(false)
	}
}

/**
 * Tenta autenticar o socket assim que conectado
 */
addSocketListener('connect', () => {
	const token = getToken()
	if (typeof token === 'string') authenticate(token)
})
