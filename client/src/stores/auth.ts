/*
 * Esse módulo existe porque o sapper não suporta que módulos (.js/.ts) acessem
 * nenhuma das stores do módulo '@sapper/app', o que inclui a store de sessão,
 * que é a que os componentes usam para saber se o usuário está logado ou não
 *
 * Essa store é basicamente uma store derivada daquela com o valor da loggedIn
 *
 * Assim que módulus puderem acessar as store do @sapper/app esse módulo será
 * completamente desnecessário e deve ser substituído pela store de sessão
 */
import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'

/** Prop que a SessionStore deve ter para esse módulo funcionar */
type SessionStore = {
	loggedIn: boolean
}

/**
 * Store que armazena se o cliente está autenticado ou não
 */
const { subscribe, set } = writable<boolean>(false)

/**
 * Exporta o subscribe para esse módulo ser uma store
 */
export { subscribe }

/**
 * Inicializa a store de autenticação no modo SSR
 *
 * @param session A instância da store de sessões
 */
export async function init<T extends SessionStore>(session: Writable<T>) {
	session.subscribe(v => {
		set(v.loggedIn)
	})
}
