import assert from 'assert'
import type { CreateSend } from './db/models/newTransactions'

type Options = {
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
	/**
	 * Função que deve ser chamada com o Map<account, amount> para executar o
	 * saque quando ou o tempo limite da transação mais antiga ou o número mínimo
	 * de transações for atingido (o que vier primeiro)
	 */
	callback: (opids: Set<string>, txs: Map<string, number>) => void
}

export default class WithrawScheduler {
	/** Instância do timeout desde a tx mais antiga ainda armazenada */
	private timeout: null|NodeJS.Timeout

	/** Tempo máximo que uma transação pode esperar antes de ser enviada [ms] */
	private limitTime: number

	/**
	 * Quantidade de transações que o scheduler esperar ter antes de executar
	 * o callback com as transações
	 */
	private minTxs: number

	/** Função que deve ser chamada quando o timeout ou o minTx ser atingido */
	private callback: (opids: Set<string>, txs: Map<string, number>) => void

	/** Set com os opids dos requests de saque que estão esperando */
	private opids: Set<string>

	/**
	 * Um Map<account, amount> das transações que devem ser enviadas. Dois
	 * requests para a mesma account irão ser unidos em uma única transação com
	 * o amount da soma dos dois
	 */
	private txs: Map<string, number>

	constructor(options: Options) {
		this.limitTime = options.timeLimit || 360000
		this.minTxs = options.minTransactions || 10
		this.callback = options.callback
		this.opids = new Set()
		this.txs = new Map()
		this.timeout = null
	}

	/** Chama o callback com os opids e as txs e reseta os requests em memória */
	private execWithdraw() {
		this.callback(this.opids, this.txs)
		// Reseta os requests salvos
		this.opids = new Set()
		this.txs = new Map()
		if (this.timeout) {
			clearTimeout(this.timeout)
			this.timeout = null
		}
	}

	/**
	 * Adiciona uma transação à lista de transações a serem executadas
	 *
	 * A função callback informada no constructor será chamada com a lista de
	 * transações e seus opids uma vez que o scheduler tenha o mínimo de
	 * transações ou o tempo máximo desde a transação mais antiga ainda em memória
	 * seja atingido
	 *
	 * @param tx O request da transação de envio
	 */
	public add(tx: CreateSend) {
		assert(!this.opids.has(tx.opid.toHexString()), `opid already informed: ${tx.opid}`)

		const storedAmount = this.txs.get(tx.account) || 0
		this.txs.set(tx.account, storedAmount + Number(tx.amount))
		this.opids.add(tx.opid.toHexString())

		if (this.opids.size >= this.minTxs) this.execWithdraw()
		else if (!this.timeout) {
			this.timeout = setTimeout(() => this.execWithdraw(), this.limitTime)
		}
	}
}
