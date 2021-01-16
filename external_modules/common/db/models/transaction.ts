import mongoose, { Schema } from 'mongoose'
import { ObjectId } from 'mongodb'
import type { Document, Model, CreateDocumentDefinition } from 'mongoose'

type NotOptional<T, K extends keyof T> = T & {
	[P in K]-?: T[P]
}

/** Interface dos valores comuns entre send, receive e send request */
interface Base extends Document {
	/** Identificador da transação no servidor principal */
	opid?: ObjectId
	/** Account de destino da transação (para receive é a account do usuário) */
	account: string
	/** Se a transação é de recebimento ou saque */
	type: 'send'|'receive'
	/** Amount transacionado */
	amount: number
}

/** Interface base do documento de uma transação já executada */
interface BaseTx extends Base {
	/** Identificador da transação na rede da moeda */
	txid: string
	/** Status da transação, de acordo com a rede da moeda */
	status: 'pending'|'confirmed'
	/** Quantidade de confirmações que essa transação tem, caso tenha */
	confirmations?: number
	/** Timestamp de execução da transação, de acordo com a rede da moeda */
	timestamp: Date
	/** Se a transação foi confirmada e sincronizada com o main server */
	completed?: boolean
}

/** Interface de uma transação de recebimento */
export interface ReceiveDoc extends BaseTx {
	type: 'receive'
}

/** Interface de uma transação de saque */
export interface SendDoc extends NotOptional<BaseTx, 'opid'> {
	type: 'send'
}

/** Interface de um request de saque */
export interface SendRequestDoc extends NotOptional<Base, 'opid'> {
	type: 'send'
	/** Requests de saque SEMPRE tem status 'requested' */
	status: 'requested'
}

/** Interface do documento de uma transação no DB */
export type TransactionDoc = SendDoc | ReceiveDoc | SendRequestDoc

/** Type de um objeto para criação de um documento de transação de recebimento */
export type CreateReceive = Omit<CreateDocumentDefinition<ReceiveDoc>, '_id'|'opid'|'completed'>

/** Type de um objeto para criação de um documento de transação de saque */
export type CreateSend = Omit<CreateDocumentDefinition<SendDoc>, '_id'|'completed'>

/** Type de um objeto para criação de um documento de request de saque */
export type CreateSendRequest = Omit<CreateDocumentDefinition<SendRequestDoc>, '_id'>

/** Interface do model de um Send (discriminator), com os métodos estáticos */
interface SendModel extends Model<SendDoc|SendRequestDoc> {
	/** Cria um documento de um request de saque */
	createRequest(request: Pick<CreateSendRequest, 'opid'|'account'|'amount'>): Promise<SendRequestDoc>
}

const TransactionSchema = new Schema({
	opid: {
		type: ObjectId,
		required: function(this: TransactionDoc) {
			// Faz opid ser required caso type seja send
			return this.type == 'send'
		},
	},
	txid: {
		type: String,
		required: function(this: TransactionDoc) {
			// Faz txid ser required caso a tx já esteja na rede (pending/confirmed)
			return this.status != 'requested'
		},
		validate: {
			validator: function(this: TransactionDoc) {
				// Validator n roda caso o valor seja undefined
				// Retorna false caso type seja request, pq request n pode ter txid
				return this.status != 'requested'
			},
			message: 'A transaction request can not have a txid'
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
		type: Number,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive numeric value`
		}
	},
	status: {
		type: String,
		enum: ['requested', 'pending', 'confirmed'],
		required: true,
		validate: {
			validator: function(this: TransactionDoc, v: TransactionDoc['status']) {
				// Tx de recebimento não pode ter status requested
				return this.type == 'receive' ? v != 'requested' : true
			},
			message: 'A receive transaction can not have status requested'
		},
	},
	completed: {
		type: Boolean,
		required: false,
		default: false,
		validate: {
			validator: function(this: TransactionDoc, v: boolean) {
				// Um request ou tx pendente não pode estar completed
				return this.status == 'confirmed' ? true : !v
			},
			message: 'An unconfirmed transaction can not be completed'
		},
	},
	confirmations: {
		type: Number,
		min: 0,
		required: false,
	},
	timestamp: {
		type: Date,
		required: function(this: TransactionDoc) {
			// Faz timestamp ser required caso não seja um request de saque
			return this.status != 'requested'
		}
	}
}, {
	discriminatorKey: 'type',
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

/** Schema do discriminator de um request de uma transação de saque */
const SendSchema = new Schema()

// Adicionado um método helper de criar um request de saque no schema
SendSchema.static('createRequest', function(this: SendModel,
	request: Parameters<SendModel['createRequest']>[0]
): ReturnType<SendModel['createRequest']> {
	return this.create<SendRequestDoc>({
		...request,
		type: 'send',
		status: 'requested',
	})
})

/** Model de uma transaction */
const Transaction = mongoose.model<TransactionDoc>('transaction', TransactionSchema)

export default Transaction

/** Model discriminator de uma transação de receive */
export const Receive = Transaction.discriminator<ReceiveDoc>('receive', new Schema())

/** Model discriminator de uma transação de saque */
export const Send = Transaction.discriminator<SendDoc|SendRequestDoc, SendModel>('send', SendSchema)
