import mongoose, { Schema, Document } from 'mongoose'
import { TxReceived, TxSend } from '../../../common'
import { ObjectId } from 'bson'

export interface PTx extends Document {
	txid: string,
	received: TxReceived
	send: TxSend
}

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

const PendingTxSchema: Schema = new Schema({
	txid: {
		type: String,
		unique: true,
		sparse: true,
		required: false
	},
	received: {
		txid: {
			type: String,
			required: true,
			unique: true
		},
		...TxBaseSchema.obj
	},
	opid: {
		type: ObjectId,
		unique: true,
		sparse: true,
		required: false
	},
	send: {
		opid: {
			type: ObjectId,
			required: true,
			unique: true
		},
		...TxBaseSchema.obj
	}
})

export default mongoose.model<PTx>('pendingTx', PendingTxSchema, 'pendingTxs')
