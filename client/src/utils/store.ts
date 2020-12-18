import axios from 'axios'
import { Readable, writable } from 'svelte/store'
import { subscribe as subscribeToAuth } from '../stores/auth'
import type { Writable } from 'svelte/store'

type Options<T> = {
	/** URL do entrypoint da API que retorna os valores dessa store */
	apiUrl: string
	/** Função que retorna um valor do type da store para iniciaização e reset */
	resetter: () => T
	/**
	 * Flag que indica se a store é uma store de dados de usuário, ou seja,
	 * contém dados que devem existir apenas enquando o usuário está logado e
	 * serem "restados" uma vez que o usuário se deslogar
	 */
	userDataStore?: boolean
	/** Parâmetros necessário para o request à API retornar os valores da store */
	fetchParameters?: Record<string, string|number|boolean>
}

type ListOptions<T> = Omit<Options<T>, 'resetter'> & {
	/**
	 * Propriedade única do item no array da store para comparação, caso seja uma
	 * store de objetos
	 */
	key?: string
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

	/** Flag que indica se a store é uma store de dados do usurio */
	protected readonly userDataStore: boolean

	constructor(options: Options<T>) {
		this.getEmptyStore = options.resetter
		this.userDataStore = options.userDataStore

		const { subscribe, set, update } = writable<T>(this.getEmptyStore())
		this.subscribe = subscribe
		this.update = update
		this.set = set

		const urlSearchParams = new URLSearchParams()
		for (const key in options.fetchParameters) {
			urlSearchParams.append(key, options.fetchParameters[key].toString())
		}
		const searchParams = `${urlSearchParams.toString()}`
		this.apiUrl = options.apiUrl + (searchParams ? `?${searchParams}` : '')

		/**
		 * Checa se está no browser
		 *
		 * Checar se está no browser impede que a store seja iniciada no servidor,
		 * pois, do modo que está implementado agora, as stores são globais, então
		 * múltiplos requests podem manipular a store antes da renderização, causado
		 * dados "vazarem" entre os requests e gerar uma renderização inconsistente.
		 * Se a store for da dados do usuário, isso pode causar dados de usuário
		 * serem exibidos para outro usuário
		 */
		if (typeof window != 'undefined') {
			// UserDataStores só podem ser populadas se autenticado
			if (this.userDataStore) {
				subscribeToAuth(auth => this.handleAuthentication(auth))
			} else {
				this.populate()
			}
		}
	}

	/** Popula a store com dados da API, substituído o conteúdo preente */
	private async populate() {
		try {
			const { data } = await axios.get<T>(this.apiUrl)
			console.log(`Populate for '${this.apiUrl}':`, data)
			this.set(data)
		} catch (err) {
			// Store data may not reflect server data
			this.set(this.getEmptyStore())
			setTimeout(this.populate.bind(this), 10000)
			console.error(`Populate ERROR for '${this.apiUrl}':`, err.response?.statusText || err.code || err, '\b,trying again in 10 seconds...')
		}
	}

	/** Lida com atualização de valores para autenticação de desautenticação */
	private async handleAuthentication(auth: boolean) {
		if (auth) await this.populate()
		else this.set(this.getEmptyStore())
	}

	/**
	 * "Inicializa" a store, substituíndo o valor atual pelo informado; Utilizado
	 * para possibilitar a inicialização da store no cliente ANTES da renderização
	 * começar
	 */
	public init(value: T) {
		// Impede que stores de usuário sejam inicializadas no modo SSR
		if (typeof window == 'undefined' && this.userDataStore) return
		this.set(value)
	}
}

export abstract class ListStore<T> extends Store<T[]> {
	/** Valor privado (setável) do lenght da store */
	private _length: number

	/**
	 * Caso essa store seja de objetos, key é a propriedade que será usada para
	 * identificar/comparar um item no array
	 */
	protected key?: string

	/** Flag que indica se a função de fetch está sendo executada */
	private inSync: boolean

	/** Flag que indica se essa store está syncronizada com a API */
	private fullySync: boolean

	/** Set que atualiza o fullySync e a store syncronized */
	private setSynchronized: Writable<boolean>['set']

	/** Store que indica se essa store está totalmente syncronizada */
	public readonly synchronized: Readable<boolean>

	/** Quantidade de itens nessa store */
	public get length() {
		return this._length
	}

	constructor(options: ListOptions<T>) {
		super({
			...options,
			resetter: () => [],
		})
		this.key = options.key

		const { subscribe, set } = writable(false)
		this.setSynchronized = set
		this.synchronized = { subscribe }

		// Mantém o length e a store de synchronized atualizados
		this.subscribe(v => {
			// this.length ainda está com o valor antigo. v é o novo valor da store
			if (this.length === v.length) this.setSynchronized(true)
			this._length = v.length
		})

		// Mantém o fullySync atualizado
		this.synchronized.subscribe(v => this.fullySync = v)
	}

	/**
	 * Busca por mais 10 transações caso a não esteja sincronizada com o servidor
	 */
	public async fetch() {
		if (this.fullySync || this.inSync) return
		this.inSync = true

		try {
			const { data } = await axios.get<T[]>(this.apiUrl, {
				params: { skip: this.length }
			})

			this.update(arr => {
				for (const d of data) {
					let index: number
					if (this.key) {
						index = arr.findIndex(t => t[this.key] === d[this.key])
					} else {
						index = arr.findIndex(t => t === d)
					}
					if (index == -1) arr.push(d)
				}

				return arr
			})
		} catch (err) {
			console.error(`ListStore fetch ERROR for '${this.apiUrl}':`, err.response?.statusText || err.code)
		}

		this.inSync = false
	}
}
