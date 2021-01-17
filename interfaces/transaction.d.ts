import type { SuportedCurrencies } from '../src/libs/currencies'

/** Interface de uma transação recebida */
export type TxReceived = {
	/** Identificador único dessa transação */
	txid: string
	/** Account de destino da transação */
	account: string
	/** Quantidade transactionada */
	amount: string|number
	/** Status da transação, na rede da moeda */
	status: 'pending'|'confirmed'
	/** Quantidade de confirmações que essa transação tem, caso tenha */
	confirmations?: number
	/** Timestamp da na rede da moeda */
	timestamp: number
}

/**
 * Interface para atualização de transações recebidas utilizando
 * o evento update_received_tx
 */
export type UpdtReceived = {
	/** Identificador da operação da transação no servidor principal */
	opid: string
	/** Status da transação, na rede da moeda */
	status: 'pending'|'confirmed'
	/** Quantidade de confirmações que essa transação tem, caso tenha */
	confirmations?: number
}

/**
 * Interface para atualização de transações enviadas utilizando
 * o evento update_sent_tx
 */
export type UpdtSent = {
	/** Identificador da operação da transação no servidor principal */
	opid: string
	/** Identificador da transação na rede da moeda */
	txid: string
	/** Status da transação, na rede da moeda */
	status: 'pending'|'confirmed'
	/** Quantidade de confirmações que essa transação tem, caso tenha */
	confirmations?: number
	/** O timestamp da transação na rede da moeda */
	timestamp: number
}

/** Interface para ordens de envio de transações */
export type WithdrawRequest = {
	/** Identificador da operação da transação no servidor principal */
	opid: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação na unidade base da moeda */
	amount: number|string
}

/** Interface de atualização de quando uma transação é cancelada */
export type CancellSent = {
	/** Identificador da operação da transação no servidor principal */
	opid: string
	status: 'cancelled'
}

/**
 * Objeto retornado pelo servidor quando é requisitado uma transação
 */
export type TxInfo = {
	/** Identificador da operação da transação no servidor principal */
	opid: string
	/** Identificador da transação na rede da moeda */
	txid: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação na unidade base da moeda */
	amount: number
	/** Se é uma transação de saque ou recebimento */
	type: 'send'|'receive'
	/** O status da operação no sistema */
	status: 'processing'|'pending'|'confirmed'
	/** A quantidade de confirmações dessa transação, caso tenha */
	confirmations?: number
	/** A currency que essa transação se refere */
	currency: SuportedCurrencies
	/** O timestamp da transação na rede da moeda */
	timestamp: number
	/** O fee dessa transação, caso seja de saque */
	fee?: number
}
