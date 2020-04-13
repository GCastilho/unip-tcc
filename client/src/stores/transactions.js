import { writable } from 'svelte/store'

const { subscribe, set, update } = writable([])

/**
 * Exporta a store para permitir modificação da lista de transactions
 */
export { subscribe, set, update }
