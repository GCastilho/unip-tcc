import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId, Decimal128 } from 'mongodb'
import { Person } from './person/interface'
import { SuportedCurrencies } from '../../currencyApi/currencyApi'

/** Interface base de uma transaction */
interface Transaction {
	/** Identificador único dessa transação */
	txid: string
	/** Account de destino da transação */
	account: string
	/** Amount da transação */
	amount: number|bigint|string
	/**
	 * Status da transação
	 * 
	 * pending: A transação foi recebida mas ainda não foi confirmada pela rede
	 * 
	 * confirmed: A transação foi confirmada pela rede e é considerada
	 * irreversível
	 */
	status: 'pending'|'confirmed'
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

/** A interface dessa collection */
interface TransactionDoc extends Document {
	_id: ObjectId
	/** Referência ao usuário dono dessa transação */
	user: Person['_id']
	/**
	 * Status da transação
	 * 
	 * pending: A transação já foi processada e aceita no saldo do usuário e
	 * está pendente para ser confirmada na rede
	 * 
	 * confirmed: A transação foi confirmada na rede e teve o saldo do usuário
	 * atualizado no database
	 * 
	 * processing: A transação ainda não foi processada no saldo do usuário,
	 * podendo ser negada quando isso ocorrer (e deletada do db)
	 */
	status: ExternalModuleTransaction['status']|'processing'
	/** De qual currency essa transação se refere */
	currency: SuportedCurrencies
	/** Identificador da transação na rede da moeda */
	txid: TransactionInternal['txid']
	/** Account de destino da transação */
	account: TransactionInternal['account']
	/** Amount da transação */
	amount: Decimal128
	/** Tipo dessa transação */
	type: TransactionInternal['type']
	/**
	 * A quantidade de confirmações que uma transação tem. Transações
	 * confirmadas em um único bloco (como a NANO) não precisam utilizar isso
	 */
	confirmations?: TransactionInternal['confirmations']
	/** O timestamp da transação na rede da moeda */
	timestamp: TransactionInternal['timestamp']
}

/** Schema da collection de transações dos usuários */
const TransactionSchema: Schema = new Schema({
	user: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	txid: {
		type: String,
		sparse: true,
		unique: true
	},
	type: {
		type: String,
		enum: ['receive', 'send'],
		required: true
	},
	currency: {
		type: String,
		enum: ['bitcoin', 'nano'],
		required: true
	},
	status: {
		type: String,
		enum: [ 'processing', 'pending', 'confirmed' ],
		required: true
	},
	confirmations: {
		type: Number,
		min: 0,
		required: false
	},
	account: {
		type: String,
		required: true
	},
	amount: {
		type: Decimal128,
		required: true
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Model da collection Transactions, responsável por armazenar as transações
 * dos usuários
 */
export default mongoose.model<TransactionDoc>('Transaction', TransactionSchema)
