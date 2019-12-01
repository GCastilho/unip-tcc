import mongoose, { Schema, Document } from 'mongoose'
import { Person } from './person/interface'

/**
 * Master Server Transaction Interface
 * 
 * Interface de transações base utilizada pelo servidor principal e pelos
 * módulos externos
 */
export interface MST {
	/** Identificador único dessa transação */
	txid: string,
	/** Account que recebeu a transação */
	account: string,
	/** Amount da transação */
	amount: number
	/**
	 * Timestamp da transação, o servidor principal usa Date, os módulos
	 * externos transmitem o timestamp como um number
	 */
	timestamp: number | Date
}

/**
 * External Module Transaction Interface
 * 
 * Interface Transaction que os módulos externos utilizam para comunicação com
 * o servidor principal
 */
export interface EMT extends MST {
	timestamp: number
}

/**
 * Interface Transaction do servidor principal
 */
export interface Transaction extends MST {
	/** Timestamp da transação */
	timestamp: Date
}

/** A interface dessa collection */
interface TransactionDoc extends Transaction, Document {
	/** Referência ao usuário dono dessa transação */
	user: Person['_id'],
	/** Tipo dessa transação */
	type: 'receive' | 'send'
}

/** Schema da collection de transações dos usuários */
const TransactionSchema: Schema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: 'Person'
	},
	txid: {
		type: String,
		unique: true,
		sparse: true
	},
	type: {
		type: String,
		enum: ['receive', 'send'],
		required: true
	},
	account: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
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
