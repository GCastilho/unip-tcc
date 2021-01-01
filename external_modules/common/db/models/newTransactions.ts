import mongoose, { Document, Schema } from 'mongoose'
import { ObjectId } from 'mongodb'
import type { DocumentDefinition } from 'mongoose'

type NotOptional<T, K extends keyof T> = T & {
	[P in K]-?: T[P]
}

// O Omit estava dando incompatibilidade no mongoose.model
type Remove<T, K extends keyof T> = T & {
	[P in K]: never
}

/** Interface base do documento de uma transação */
interface BaseTx extends Document {
	/** Identificador da transação no servidor principal */
	opid?: ObjectId
	/** Identificador da transação na rede da moeda */
	txid?: string
	/** Account de destino da transação (para receive é a account do usuário) */
	account: string
	/** Se a transação é de saque ou recebimento */
	type: 'send'|'receive'
	/** Amount transacionado */
	amount: string
	/** Status da transação, de acordo com a rede da moeda */
	status: 'pending'|'confirmed'
	/** Se a transação foi confirmada e sincronizada com o main server */
	completed?: boolean
	/** Quantidade de confirmações que essa transação tem, caso tenha */
	confirmations?: number
	/** Timestamp de execução da transação, de acordo com a rede da moeda */
	timestamp: number
}

/** Interface de uma transação de recebimento */
export interface ReceiveDoc extends NotOptional<BaseTx, 'txid'> {
	type: 'receive'
}

/** Interface de uma transação de saque */
interface SendDoc extends NotOptional<BaseTx, 'opid'> {
	type: 'send'
}

/** Interface de um request de saque */
interface SendRequestDoc extends Remove<BaseTx, 'txid'|'status'|'completed'|'confirmations'|'timestamp'> {
	opid: ObjectId
	type: 'send'
}

/** Interface do documento de uma transação no DB */
export type Transaction = SendDoc | ReceiveDoc | SendRequestDoc

/** Type de um objeto para criação de um documento de transação de recebimento */
export type Receive = DocumentDefinition<ReceiveDoc>

/** Type de um objeto para criação de um documento de transação de saque */
export type Send = DocumentDefinition<SendDoc>

/** Type de um objeto para criação de um documento de request de saque */
export type SendRequest = DocumentDefinition<SendRequestDoc>

const TransactionSchema = new Schema({
	opid: {
		type: ObjectId,
		required: function(this: Transaction) {
			// Faz opid ser required caso type seja send
			return this.type == 'send'
		},
	},
	txid: {
		type: String,
		required: function(this: Transaction) {
			// Faz txid ser required caso type seja receive
			return this.type == 'receive'
		},
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
		required: function(this: Transaction) {
			// Required para tx de recebimento e de send já enviada
			return this.type == 'receive' || this.type == 'send' && typeof this.txid == 'string'
		}
	},
	completed: {
		type: Boolean,
		required: false,
		default: false,
	},
	confirmations: {
		type: Number,
		min: 0,
		required: false
	},
	timestamp: {
		type: Number,
		required: function(this: Transaction) {
			// Faz timestamp ser required caso status esteja definido (tx executada)
			return typeof this.status == 'string'
		}
	}
})

/** Faz o index existir apenas se tiver um opid */
TransactionSchema.index({
	opid: 1
}, {
	unique: true,
	partialFilterExpression: {
		opid: { $exists: true }
	}
})

/**
 * Faz transações de recebimento terem txid unique e permite que transações
 * para mais de uma account do sistema (um batch) sejam reconhecidas como
 * transações diferentes
 */
TransactionSchema.index({
	txid: 1,
	type: 1,
	account: 1,
}, {
	unique: true,
	partialFilterExpression: {
		txid: { $exists: true },
		type: 'receive',
	}
})

/**
 * Cria um index para transações de saque que permita várias transações com o
 * mesmo txid (necessário para fazer batch)
 */
TransactionSchema.index({
	txid: 1,
	type: 1,
}, {
	partialFilterExpression: {
		txid: { $exists: true },
		type: 'send',
	}
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
