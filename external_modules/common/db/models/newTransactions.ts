import mongoose, { Document, Schema } from 'mongoose'
import { ObjectId } from 'mongodb'

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
	Pick<T, Exclude<keyof T, Keys>>
	& {
		[K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
	}[Keys]

interface RawTX {
	/** Identificador da transação no servidor principal */
	opid?: string
	/** Identificador da transação na rede da moeda */
	txid?: string
	/** Account do usuário que recebeu a transação */
	account: string
	/** Se a transação é de saque ou recebimento */
	type: 'send'|'receive'
	/** Amount recebido pelo usuário na transação */
	amount: string
	/** Status da transação, de acordo com a rede da moeda */
	status: 'pending'|'confirmed'
	/** Quantidade de confirmações que essa transação tem, caso tenha */
	confirmations?: number
	/** Timestamp de execução da transação, de acordo com a rede da moeda */
	timestamp: number
}

export type Transaction = RequireAtLeastOne<RawTX, 'opid'|'txid'> & Document

const TransactionSchema = new Schema({
	opid: {
		type: ObjectId,
		required: false,
	},
	txid: {
		type: String,
		required: true,
	},
	account: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['send', 'receive'],
		required: true
	},
	amount: {
		type: String,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive numeric value`
		}
	},
	status: {
		type: String,
		enum: ['pending', 'confirmed'],
		required: true
	},
	confirmations: {
		type: Number,
		min: 0,
		required: false
	},
	timestamp: {
		type: Number,
		required: true
	}
})

/* Faz o index existir apenas se tiver um opid */
TransactionSchema.index({
	opid: 1
}, {
	unique: true,
	partialFilterExpression: {
		opid: { $exists: true }
	}
})

/*
 * Faz o index composto do txid e type existir apenas caso o txid não seja nulo
 */
TransactionSchema.index({
	txid: 1,
	type: 1
}, {
	unique: true,
	partialFilterExpression: {
		txid: { $exists: true }
	}
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
