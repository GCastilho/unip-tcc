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
		required: false
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

export interface PSended extends Document {
	opid: ObjectId
	journaling: string
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

export const SendPending = mongoose.model<PSended>('SendPendingTx', PendingSendSchema)
