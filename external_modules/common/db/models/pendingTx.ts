import mongoose, { Schema, Document } from 'mongoose'
import { UpdtSent } from '../../../../interfaces/transaction'
import { ObjectId } from 'mongodb'

export interface PReceived extends Document {
	txid: string
	transaction: {
		/** Identificador da transação no servidor principal */
		opid?: string
		/** Identificador da transação na rede da moeda */
		txid: string
		/** Account do usuário que recebeu a transação */
		account: string
		/** Amount recebido pelo usuário na transação */
		amount: string
		/** Status da transação, de acordo com a rede da moeda */
		status: 'pending'|'confirmed'
		/** Quantidade de confirmações que essa transação tem, caso tenha */
		confirmations?: number
		/** Timestamp de execução da transação, de acordo com a rede da moeda */
		timestamp: number
	}
}

const PendingReceivedSchema = new Schema({
	txid: {
		type: String,
		unique: true,
		required: true
	},
	transaction: {
		opid: {
			type: String,
			required: false,
			unique: true,
			sparse: true
		},
		txid: {
			type: String,
			required: true,
			unique: true
		},
		account: {
			type: String,
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
	}
})

export const ReceivedPending = mongoose.model<PReceived>('ReceivedPendingTx', PendingReceivedSchema, 'pendingReceived')

export interface PSent extends Document {
	/** Identificador da transação no servidor principal */
	opid: ObjectId
	/**
	 * Journaling da transação, para manter registro de o que já aconteceu com ela
	 *
	 * requested: A transação foi recebida do main e não foi enviada para a rede
	 *
	 * picked: A transação foi enviada para a função de saque e não se sabe se
	 * foi enviada ou não
	 *
	 * sended: A função de saque retornou sucesso e a transação foi enviada
	 *
	 * batched: A função de saque retornou true, indicando que a transação foi
	 * agendada para ser enviada em batch
	 *
	 * pending: A transação foi enviada e sabe-se que ela está pendente
	 *
	 * confirmed: A transação foi enviada e sabe-se que ela está confirmada
	 */
	journaling: UpdtSent['status']|'requested'|'picked'|'sended'|'batched'
	transaction: {
		/** Identificador da transação no servidor principal */
		opid: string
		/** Identificador da transação na rede da moeda, quando ela é executada */
		txid?: string
		/** account de destino da transação */
		account: string
		/** amount que deve ser enviado ao destino */
		amount: string
		/** Status da transação, uma vez que ela é executada */
		status?: 'pending'|'confirmed'
		/** Confirmações que a transação tem, caso necessário */
		confirmations?: number
		/** Timestamp da transação de acordo com a rede da moeda */
		timestamp?: number
	}
}

const PendingSendSchema = new Schema({
	opid: {
		type: ObjectId,
		unique: true,
		required: true
	},
	journaling: {
		type: String,
		default: 'requested'
	},
	transaction: {
		opid: {
			type: String,
			required: true,
			unique: true
		},
		txid: {
			type: String,
			required: false,
			unique: true,
			sparse: true
		},
		account: {
			type: String,
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
			required: false
		},
		confirmations: {
			type: Number,
			min: 0,
			required: false
		},
		timestamp: {
			type: Number,
			required: false
		}
	}
})

export const SendPending = mongoose.model<PSent>('SendPendingTx', PendingSendSchema, 'pendingSend')
