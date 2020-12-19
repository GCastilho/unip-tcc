import axios from 'axios'
import { addSocketListener } from './websocket'
import { Readable, writable } from 'svelte/store'
import { subscribe as subscribeToAuth } from '../stores/auth'
import type { Writable } from 'svelte/store'
import type { SuportedCurrencies as SC } from '../../../src/libs/currencies'

type SvelteStoreOptions<T> = {
	/** Função que retorna um valor do type da store para iniciaização e reset */
	resetter: () => T
}

/** Store genérica */
class SvelteStore<T> {
	/** Subscribe on value changes */
	public subscribe: Writable<T>['subscribe']

	/** Set value and inform subscribers */
	protected set: Writable<T>['set']

	/** Update value using callback and inform subscribers */
	protected update: Writable<T>['update']

	/** Retorna um valor da "store vazia" mas sendo um valor do tipo T */
	protected getEmptyStore: () => T

	constructor(options: SvelteStoreOptions<T>) {
		this.getEmptyStore = options.resetter

		const { subscribe, set, update } = writable<T>(this.getEmptyStore())
		this.subscribe = subscribe
		this.update = update
		this.set = set
	}
}

type Options<T> = SvelteStoreOptions<T> & {
	/** URL do entrypoint da API que retorna os valores dessa store */
	apiUrl: string
	/**
	 * Flag que indica se a store é uma store de dados de usuário, ou seja,
	 * contém dados que devem existir apenas enquando o usuário está logado e
	 * serem "restados" uma vez que o usuário se deslogar
	 */
	userDataStore?: boolean
	/** Parâmetros necessário para o request à API retornar os valores da store */
	fetchParameters?: Record<string, string|number|boolean>
}

/**
 * Store genérica capacidade de se auto popular automáticamente usando a API e
 * lidar com autenticação de usuário
 */
export default abstract class Store<T> extends SvelteStore<T> {
	/** URL formatada (e com os parâmetros) do entrypoint da API dessa store */
	public readonly apiUrl: string

	/** Flag que indica se a store é uma store de dados do usurio */
	protected readonly userDataStore: boolean

	constructor(options: Options<T>) {
		super({
			resetter: options.resetter,
		})
		this.userDataStore = options.userDataStore

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

type ListOptions<T> = Omit<Options<T>, 'resetter'> & {
	/**
	 * Propriedade única do item no array da store para comparação, caso seja uma
	 * store de objetos
	 */
	key?: string
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

	constructor(options: ListOptions<T[]>) {
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

/**
 * First-class Function que mantém instancias de uma store de um mesmo propósito
 * mas diferentes dependendo do par de currencies envolvidas na operação
 * @param StoreClass Uma classe que extende a Store e recebe base a target como
 * parâmetro
 */
export function createStoreMap<T>(
	StoreClass: (new(base: SC, target: SC) => Store<T>)
) {
	const map = new Map<string, Store<T>>()

	/**
	 * Retorna uma Store das currencies requisitadas
	 * @param base A currency Base desse par
	 * @param target A currency Target desse par
	 * @todo Quando for implementar a limpeza da memória de stores instanciadas
	 * não esquecer de remover os liteners do websocket
	 */
	return function getStore(base: SC, target: SC) {
		if (base == target) throw new Error('Currency base must be different from Currency target')
		const mapKey = `${base}-${target}`
		let store = map.get(mapKey)
		if (!store) {
			store = new StoreClass(base, target)
			map.set(mapKey, store)
		}
		return store
	}
}

/**
 * First-class Function que retorna uma função que adiciona listeners ao
 * websocket. Essa função adiciona um listener com um filtro, que irá chamar
 * apenas o callback referente as currencies informadas como chave
 * @param event O nome do evento do websocket que será monitorado
 */
export function createEventDispatcher(event: string) {
	type EventListenerCallback = (
		arg1: { currencies: [SC, SC] },
		...args: unknown[]
	) => void

	const map = new Map<string, EventListenerCallback>()

	addSocketListener(event, (...args: Parameters<EventListenerCallback>) => {
		const callback = map.get(args[0].currencies?.join('-'))
		if (typeof callback == 'function') callback(...args)
	})

	/**
	 * Adiciona um listener ao websocket com um callback. Esse callback só será
	 * chamado se o objeto do primeiro argumento do evento tiver uma propriedade
	 * 'currencies' com as mesmas currencies (e na mesma ordem) que as informadas
	 * como parâmetro desta função
	 */
	return function addListener(
		currencies: [SC, SC],
		callback: EventListenerCallback,
	) {
		map.set(currencies.join('-'), callback)
	}
}

type MapStoreOptions<T> = SvelteStoreOptions<T> & {
	/**
	 * Referência instanciável da Store de type T que recebe base a target como
	 * parâmetro
	 */
	store: { new (base: SC, target: SC): SvelteStore<T> }
}

/**
 * Mantém instâncias de uma store de um mesmo propósito que são diferentes
 * dependendo do par de currencies envolvidas na operação. Ao utilizar o
 * setCurrencies esta store irá se increver na store referente a esse par e
 * quaisquer mudanças nela irão refletir no estado desta store
 */
export class MapStore<T> extends SvelteStore<T> {
	/** Um Map com as instâncias de T filhas desta store */
	private map: Map<string, SvelteStore<T>>

	/** Referência instanciável da Store de type T */
	private storeClass: { new(base: SC, target: SC): SvelteStore<T>}

	/** desincreve do listener da filha, caso inscrito */
	private unsubStoreClass?: ReturnType<Writable<T>['subscribe']>

	constructor(options: MapStoreOptions<T>) {
		super({
			resetter: options.resetter,
		})
		this.map = new Map()
		this.storeClass = options.store
	}

	/** Seleciona o par de currencies que esta store deverá refletir */
	public setCurrencies(base?: SC, target?: SC): void {
		if (!base || !target) return
		if (base == target) throw new Error('Currency base must be different from Currency target')
		const mapKey = `${base}-${target}`
		let store = this.map.get(mapKey)
		if (!store) {
			store = new this.storeClass(base, target)
			this.map.set(mapKey, store)
		}
		if (typeof this.unsubStoreClass == 'function') this.unsubStoreClass()
		this.unsubStoreClass = store.subscribe(v => this.set(v))
	}
}
