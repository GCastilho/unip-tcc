type PromiseExecutor<T> = {
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (reason?: unknown) => void
}

export default class Queue<T> implements AsyncGenerator<T, void, never> {
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
	 * Encerra a execução do generator, impedindo novos valores de serem
	 * adicionados
	 */
	public return() {
		this.finished = true

		// retorna done, que tbm faz o for..of loop ser encerrado sem ser executado
		for (const promise of this.unresolvedPromises) {
			promise.resolve(this.createIterResult(undefined))
		}
		// Reseta (descarta) o array de valores não consumidos
		this.unconsumedValues = []

		return Promise.resolve(this.createIterResult(undefined))
	}

	/** Throws an error to the generator and finishes execution */
	public throw(err: Error): Promise<IteratorResult<T, void>> {
		this.return()
		throw err
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
