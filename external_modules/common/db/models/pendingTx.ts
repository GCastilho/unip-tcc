import mongoose, { Schema, Document } from 'mongoose'
import { TxReceived, TxSend } from '../../../common'
import { ObjectId } from 'bson'

const TxBaseSchema = new Schema({
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
		enum: [ 'pending', 'confirmed' ],
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
		txid: {
			type: String,
			required: true,
			unique: true
		},
		...TxBaseSchema.obj
	}
})

export const ReceivedPending = mongoose.model<PReceived>('ReceivedPendingTx', PendingReceivedSchema)

export interface PSended extends Document {
	opid: ObjectId
	transaction: TxSend
}

const PendingSendSchema = new Schema({
	opid: {
		type: ObjectId,
		unique: true,
		required: true
	},
	transaction: {
		opid: {
			type: ObjectId,
			required: true,
			unique: true
		},
		...TxBaseSchema.obj
	}
})

export const SendPending = mongoose.model<PSended>('SendPendingTx', PendingSendSchema)
