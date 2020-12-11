import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'

type Options<T> = {
	/** URL do entrypoint da API que retorna os valores dessa store */
	apiUrl: string
	/** Função que retorna um valor do type da store para iniciaização e reset */
	resetStore: () => T
	/** Parâmetros necessário para o request à API retornar os valores da store */
	fetchParameters?: Record<string, string|number|boolean>
}

export default abstract class Store<T> {
	/** URL formatada (e com os parâmetros) do entrypoint da API dessa store */
	public readonly apiUrl: string

	/** Subscribe on value changes */
	public subscribe: Writable<T>['subscribe']

	/** Set value and inform subscribers */
	protected set: Writable<T>['set']

	/** Update value using callback and inform subscribers */
	protected update: Writable<T>['update']

	/** Retorna um valor da "store vazia" mas sendo um valor do tipo T */
	protected resetStore: () => T

	constructor(options: Options<T>) {
		this.resetStore = options.resetStore

		const { subscribe, set, update } = writable<T>(this.resetStore())
		this.subscribe = subscribe
		this.update = update
		this.set = set

		const fetchParameters: Record<string, string> = {}
		for (const key in options.fetchParameters) {
			fetchParameters[key] = options.fetchParameters[key].toString()
		}
		this.apiUrl = new URL(
			new URLSearchParams(fetchParameters).toString(),
			options.apiUrl
		).toString()
	}

	/**
	 * "Inicializa" a store, substituíndo o valor atual pelo informado; Utilizado
	 * para possibilitar a inicialização da store no cliente ANTES da renderização
	 * começar
	 */
	public init(value: T) {
		this.set(value)
	}
}
