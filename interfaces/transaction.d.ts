import type { Transaction as TransactionDoc } from '../src/db/models/transaction'

/** Interface base de uma transaction */
interface Transaction {
	/** Identificador único dessa transação */
	txid: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação */
	amount: number|bigint|string
	/** Status da transação */
	status: TransactionDoc['status']
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: number
	/**
	 * Timestamp da transação, o servidor principal usa Date, os módulos
	 * externos transmitem o timestamp em milisegundos como um number
	 */
	timestamp: number|Date
}

/**
 * Interface base para interfaces de comunicação entre o módulo externo
 * e o main server
 */
interface ExternalModuleTransaction extends Transaction {
	amount: string
	timestamp: number
	/** Identificador da operação da transação no servidor principal */
	opid: string
}

/** Interface de uma transação recebida */
export interface TxReceived extends Transaction {
	/**
	 * Identificador da operação da transação no servidor principal; O servidor
	 * principal irá retornar uma TxReceived com opid caso o módulo externo
	 * esteja informando uma traqnsação já computada
	 */
	opid?: ExternalModuleTransaction['opid']
	timestamp: ExternalModuleTransaction['timestamp']
	amount: ExternalModuleTransaction['amount']|number
}

/** Interface para ordens de envio de transações */
export interface TxSend {
	/** Identificador da operação da transação no servidor principal */
	opid: ExternalModuleTransaction['opid']
	/** Account de destino da transação */
	account: ExternalModuleTransaction['account']
	/** Amount da transação na unidade base da moeda */
	amount: ExternalModuleTransaction['amount']
}

/**
 * Interface para atualização de transações recebidas utilizando
 * o evento update_received_tx
 */
export interface UpdtReceived {
	/** Identificador da operação da transação no servidor principal */
	opid: ExternalModuleTransaction['opid']
	/**
	 * Status da transação
	 *
	 * pending: A transação foi recebida mas ainda não foi confirmada pela rede
	 *
	 * confirmed: A transação foi confirmada pela rede e é considerada irreversível
	 */
	status: ExternalModuleTransaction['status']
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: ExternalModuleTransaction['confirmations']
}

/**
 * Interface para atualização de transações enviadas utilizando
 * o evento update_sent_tx
 */
export interface UpdtSent {
	/** Identificador da operação da transação no servidor principal */
	opid: ExternalModuleTransaction['opid']
	/** Identificador da transação na rede da moeda */
	txid: ExternalModuleTransaction['txid']
	/**
	 * Status da transação
	 *
	 * pending: A transação foi recebida mas ainda não foi confirmada pela rede
	 *
	 * confirmed: A transação foi confirmada pela rede e é considerada irreversível
	 */
	status: ExternalModuleTransaction['status']
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: ExternalModuleTransaction['confirmations']
	/** O timestamp da transação na rede da moeda */
	timestamp: ExternalModuleTransaction['timestamp']
}

export interface CancelledSentTx {
	/** Identificador da operação da transação que foi cancelada */
	opid: ExternalModuleTransaction['opid']
	status: 'cancelled'
}

/**
 * Interface Transaction do que o servidor principal usa para se comunicar
 * entre seus módulos internos
 */
export interface TransactionInternal extends Transaction {
	amount: number|bigint
	timestamp: Date
	/** Tipo dessa transação */
	type: 'receive'|'send'
}

/**
 * Objeto retornado pelo servidor ao cliente quando é requisitado informações
 * de uma transação
 */
export interface TxInfo {
	opid: string
	/** @todo os status deveriam ser apenas 'processing'|'pending'|'confirmed' */
	status: TransactionDoc['status']
	currency: TransactionDoc['currency']
	txid: TransactionDoc['txid']
	account: TransactionDoc['account']
	amount: number
	fee?: number
	type: TransactionDoc['type']
	confirmations: TransactionDoc['confirmations']
	timestamp: number
}
