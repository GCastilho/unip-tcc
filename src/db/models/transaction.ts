import mongoose, { Schema, Document } from 'mongoose'
import { Person } from './person/interface'

/** A interface dessa collection */
export interface Transaction extends Document {
	/** Referência ao usuário dono dessa transação */
	user: Person['_id'],
	/** Identificador único dessa transação */
	txid: string,
	/** Tipo dessa transação */
	type: 'receive' | 'send',
	/** Account que recebeu a transação */
	account: string,
	/** Amount da transação */
	amount: number
	/** Timestamp da transação */
	timestamp: Date
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
		required: true,
		unique: true
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
export default mongoose.model<Transaction>('Transaction', TransactionSchema)
