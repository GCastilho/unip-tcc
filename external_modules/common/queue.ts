import { Send } from './db/models/newTransactions'
import type { DocumentQuery } from 'mongoose'
import type { WithdrawRequest } from '../../interfaces/transaction'
import type { SendRequestDoc } from './db/models/newTransactions'

type PromiseExecutor<T> = {
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (reason?: unknown) => void
}

class Queue<T> implements AsyncIterator<T, void> {
	/** Fila de valores da queue */
	private unconsumedValues: T[]

	/** Fila de promessas já retornadas pelo next esperando serem resolvidas */
	private unresolvedPromises: PromiseExecutor<IteratorResult<T>>[]

	/**
	 * Flag que indica se a queue foi finalizada. Uma queue fionalizada não
	 * irá mais retornar valores
	*/
	private finished: boolean

	constructor() {
		this.unconsumedValues = []
		this.unresolvedPromises = []
		this.finished = false
	}

	/** Retorna um objeto de um IteratorResult com o done setado corretamente */
	private createIterResult(value?: T): IteratorResult<T, void> {
		return value ? { value, done: false } : { value: undefined, done: true }
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

export default class WithdrawQueue implements AsyncIterable<WithdrawRequest> {
	private queue?: Queue<WithdrawRequest>

	/** Retorna um novo iterator e faz o bootstrap com os requests do banco */
	[Symbol.asyncIterator]() {
		this.queue = new Queue()
		this.boostrap()
		return this.queue
	}

	/** Faz o bootstrap do iterator com os valores do banco */
	private async boostrap() {
		const requests = Send.find({
			status: 'requested'
		}, {
			opid: 1,
			account: 1,
			amount: 1
		}) as DocumentQuery<SendRequestDoc[], SendRequestDoc>

		for await (const { opid, account, amount } of requests) {
			this.push({ opid: opid.toHexString(), account, amount })
		}
	}

	/**
	 * Adiciona um novo valor à queue. Se a queue não estiver ativa o valor é
	 * ignorado
	 */
	public push(value: WithdrawRequest) {
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
