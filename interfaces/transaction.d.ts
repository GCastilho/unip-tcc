import type { TransactionDoc, TxJSON } from '../src/db/models/transaction'

/**
 * Interface base para interfaces de comunicação entre o módulo externo
 * e o main server
 */
interface ExternalModuleTransaction {
	/** Identificador da operação da transação no servidor principal */
	opid: string
	/** Identificador único dessa transação */
	txid: TransactionDoc['txid']
	/** Account de destino da transação */
	account: TransactionDoc['account']
	/** Amount da transação */
	amount: string
	/** Status da transação */
	status: TransactionDoc['status']
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: TransactionDoc['confirmations']
	/**
	 * Timestamp da transação, o servidor principal usa Date, os módulos
	 * externos transmitem o timestamp em milisegundos como um number
	 */
	timestamp: number
}

/** Interface de uma transação recebida */
export interface TxReceived extends Omit<
	TxJSON,
	'opid'|'amount'|'currency'|'type'|'status'
> {
	opid?: TxJSON['opid']
	status: TransactionDoc['status']
	amount: ExternalModuleTransaction['amount']
}

interface Request {
	/** Identificador da operação da transação no servidor principal */
	opid: ExternalModuleTransaction['opid']
}

/** Interface para ordens de envio de transações */
export interface WithdrawRequest extends Request {
	/** Account de destino da transação */
	account: ExternalModuleTransaction['account']
	/** Amount da transação na unidade base da moeda */
	amount: ExternalModuleTransaction['amount']
}

/** Interface do objeto de atualização de uma transação */
interface TxUpdate extends Request {
	status: ExternalModuleTransaction['status']
	confirmations?: ExternalModuleTransaction['confirmations']
}

/**
 * Interface para atualização de transações recebidas utilizando
 * o evento update_received_tx
 */
export type UpdtReceived = TxUpdate

/**
 * Interface para atualização de transações enviadas utilizando
 * o evento update_sent_tx
 */
export interface UpdtSent extends TxUpdate {
	/** Identificador da transação na rede da moeda */
	txid: ExternalModuleTransaction['txid']
	/** O timestamp da transação na rede da moeda */
	timestamp: ExternalModuleTransaction['timestamp']
}

/** Interface de atualização de quando uma transação é cancelada */
export interface CancellSent extends Request {
	status: 'cancelled'
}

/**
 * Objeto retornado pelo servidor quando é requisitado uma transação
 */
export type TxInfo = TxJSON
