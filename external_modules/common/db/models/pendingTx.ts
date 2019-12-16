import mongoose, { Schema, Document } from 'mongoose'
import { TxReceived, TxSend } from '../../../common'
import { ObjectId } from 'bson'

const TxBaseSchema = new Schema({
	opid: {
		type: ObjectId,
		required: false,
		unique: true,
		sparse: true
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
		type: Number,
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
	timestamp: {
		type: Number,
		required: true
	}
})

export interface PReceived extends Document {
	txid: string
	transaction: TxReceived
}

const PendingReceivedSchema = new Schema({
	txid: {
		type: String,
		unique: true,
		required: true
	},
	transaction: {
		...TxBaseSchema.obj,
		txid: {
			type: String,
			required: true,
			unique: true
		}
	}
})

export const ReceivedPending = mongoose.model<PReceived>('ReceivedPendingTx', PendingReceivedSchema)

export interface PSent extends Document {
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
	 * 
	 * processing: Usado apenas pelo main
	 */
	journaling: TxSend['status']|'requested'|'picked'|'sended'|'batched'
	transaction: TxSend
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
		...TxBaseSchema.obj,
		opid: {
			type: ObjectId,
			required: true,
			unique: true
		}
	}
})

export const SendPending = mongoose.model<PSent>('SendPendingTx', PendingSendSchema)
