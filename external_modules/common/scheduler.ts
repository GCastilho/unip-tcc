import assert from 'assert'
import { Send } from './db/models/transaction'
import type { DocumentQuery } from 'mongoose'
import type { WithdrawRequest } from '../../interfaces/transaction'
import type { SendRequestDoc } from './db/models/transaction'

type PromiseExecutor<T> = {
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (reason?: unknown) => void
}

export type BatchOptions = {
	/**
	 * Tempo máximo que uma transação pode esperar antes de ser enviada [ms]
	 * @default 360000 [ms]
	 */
	timeLimit?: number,
	/**
	 * Quantidade mínima de transações que devem ser enviadas no batch
	 * @default 10
	 */
	minTransactions?: number,
}

class Iterator<T> implements AsyncIterator<T, void> {
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

export abstract class Queue<T> implements AsyncIterable<T> {
	protected queue?: Iterator<T>

	/** Retorna um novo iterator e faz o bootstrap com os requests do banco */
	[Symbol.asyncIterator]() {
		this.queue = new Iterator()
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
	abstract push(value: WithdrawRequest): void

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

/** Classe para queue de withdraw de uma transação por ves */
export class Single extends Queue<Set<string>> {
	push(value: WithdrawRequest): void {
		if (!this.queue) return
		this.queue.push(new Set([value.opid]))
	}
}

/**
 * Classe para queue de withdraw de transações em batch. Se um batch tiver uma
 * única transação, ela será enviado usando a interface para transações
 * singulares
 */
export class Batch extends Queue<Set<string>> {
	/** Tempo máximo que uma transação pode esperar antes de ser enviada [ms] */
	private readonly limitTime: number

	/**
	 * Quantidade de transações que o scheduler deve esperar ter antes enviar o
	 * batch para a queue
	 */
	private readonly minTxs: number

	/** Instância do timeout desde a tx mais antiga ainda armazenada */
	private timeout: null|NodeJS.Timeout

	/** Set com os opids dos requests de saque que estão esperando */
	private opids: Set<string>

	constructor(options: BatchOptions) {
		super()
		this.limitTime = options.timeLimit || 360000
		this.minTxs = options.minTransactions || 10
		this.opids = new Set()
		this.timeout = null
	}

	/** Envia as transações para a queue para serem executadas */
	private execWithdraw() {
		if (!this.queue) return
		assert(this.opids.size > 0, 'Batch withraw requested for ZERO transactions')

		this.queue.push(this.opids)

		// Reseta os requests salvos
		this.opids = new Set()
		if (this.timeout) {
			clearTimeout(this.timeout)
			this.timeout = null
		}
	}

	public push(request: WithdrawRequest) {
		assert(!this.opids.has(request.opid), `opid already informed: ${request.opid}`)

		this.opids.add(request.opid)

		if (this.opids.size >= this.minTxs) this.execWithdraw()
		else if (!this.timeout) {
			this.timeout = setTimeout(() => this.execWithdraw(), this.limitTime)
		}
	}
}
