import axios from 'axios'
import { writable } from 'svelte/store'
import { subscribe as subscribeToAuth } from '../stores/auth'
import type { Writable } from 'svelte/store'

type Options<T> = {
	/** URL do entrypoint da API que retorna os valores dessa store */
	apiUrl: string
	/** Função que retorna um valor do type da store para iniciaização e reset */
	resetter: () => T
	/** Parâmetros necessário para o request à API retornar os valores da store */
	fetchParameters?: Record<string, string|number|boolean>
}

/** Store genérica */
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
	protected getEmptyStore: () => T

	constructor(options: Options<T>) {
		this.getEmptyStore = options.resetter

		const { subscribe, set, update } = writable<T>(this.getEmptyStore())
		this.subscribe = subscribe
		this.update = update
		this.set = set

		const fetchParams: Record<string, string> = {}
		for (const key in options.fetchParameters) {
			fetchParams[key] = options.fetchParameters[key].toString()
		}
		this.apiUrl = options.apiUrl + new URLSearchParams(fetchParams).toString()
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

/**
 * Store para dados de usuário, para dados que devem existir apenas enquando o
 * usuário está logado e serem "restados" uma vez que o usuário se deslogar
 */
export abstract class UserDataStore<T> extends Store<T> {
	/** Lida com atualização de valores para autenticação de desautenticação */
	private async handleAuthentication(auth: boolean) {
		if (auth) {
			try {
				const { data } = await axios.get<T>(this.apiUrl)
				console.log(`UserDataStore fetch for '${this.apiUrl}':`, data)
				this.set(data)
			} catch (err) {
				console.error(`UserDataStore fetch ERROR for '${this.apiUrl}':`, err.response?.statusText || err.code)
				// Store data may not reflect server data
				this.set(this.getEmptyStore())
			}
		} else {
			this.set(this.getEmptyStore())
		}
	}

	constructor(options: Options<T>) {
		super(options)
		/**
		 * Checa se está no browser
		 *
		 * Impede que a store seja iniciada no servidor com dados do cliente, que
		 * poderiam "vazar" no request do próximo usuário
		 */
		if (typeof window != 'undefined') {
			subscribeToAuth(auth => this.handleAuthentication(auth))
		}
	}
}
