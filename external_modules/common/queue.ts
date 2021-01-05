import { Send } from './db/models/newTransactions'
import type { SendRequestDoc } from './db/models/newTransactions'

type PromiseExecutor<T> = {
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (reason?: unknown) => void
}

class Queue<T> implements AsyncIterator<T, void> {
	private unconsumedValues: T[]
	private unresolvedPromises: PromiseExecutor<IteratorResult<T>>[]
	private finished: boolean

	constructor() {
		this.unconsumedValues = []
		this.unresolvedPromises = []
		this.finished = false
	}

	private createIterResult(value?: T): IteratorResult<T, void> {
		return value ? { value, done: false } : { value: undefined, done: true }
	}

	// Symbol para que esta classe seja reconhecida como um AsyncIterator
	[Symbol.asyncIterator]() {
		return this
	}

	/**
	 * Retorna uma promessa que resolve quando há um novo valor disponível. Se
	 * houver um valor na fila a promessa será resolvida imediatamente
	 */
	public next() {
		if (this.finished) return Promise.resolve(this.createIterResult(undefined))
		const value = this.unconsumedValues.shift()
		if (value) {
			return Promise.resolve(this.createIterResult(value))
		} else {
			return new Promise<IteratorResult<T>>((resolve, reject) => {
				this.unresolvedPromises.push({ resolve, reject })
			})
		}
	}

	/**
	 * Encerra a execução do generator, impedindo novos valores de serem
	 * adicionados
	 */
	public return() {
		this.finished = true

		// retorna done, que tbm faz o for..of loop ser encerrado sem ser executado
		for (const promise of this.unresolvedPromises) {
			promise.resolve(this.createIterResult(undefined))
		}
		// Reseta (descarta) os arrays de valores não consumidos
		this.unconsumedValues = []
		this.unresolvedPromises = []

		return Promise.resolve(this.createIterResult(undefined))
	}

	/**
	 * Adiciona um novo valor à queue. Os valores são mantidos em ordem e
	 * retornados pelo generator quando requisitados
	 */
	public push(value: T) {
		if (this.finished) return
		const promise = this.unresolvedPromises.shift()
		if (promise) {
			promise.resolve(this.createIterResult(value))
		} else {
			this.unconsumedValues.push(value)
		}
	}
}

export default class WithdrawQueue implements AsyncIterable<SendRequestDoc> {
	private queue?: Queue<SendRequestDoc>

	/** Retorna um novo iterator e faz o bootstrap com os requests do banco */
	[Symbol.asyncIterator]() {
		this.queue = new Queue()
		this.boostrap()
		return this.queue
	}

	/** Faz o bootstrap do iterator com os valores do banco */
	private async boostrap() {
		for await (const request of Send.find({ status: 'requested' })) {
			this.push(request as SendRequestDoc)
		}
	}

	/**
	 * Adiciona um novo valor à queue. Se a queue não estiver ativa o valor é
	 * ignorado
	 */
	public push(value: SendRequestDoc) {
		if (!this.queue) return
		this.queue.push(value)
	}

	/**
	 * Interrompe a execução da queue, retornando um { done: true }. A queue
	 * será reinicializada ao chamar o asyncIterator novamente
	 */
	public stop() {
		if (!this.queue) return
		this.queue.return()
		this.queue = undefined
	}
}
