import mongoose, { Schema, Document } from 'mongoose'
import { Transaction as Tx } from '../../../common'
import { ObjectId } from 'bson'

export interface PTx extends Document {
	txid: Tx['txid'],
	transaction: Tx
}

const PendingTxSchema: Schema = new Schema({
	txid: {
		type: String,
		unique: true,
		required: true
	},
	transaction: {
		opid: {
			type: ObjectId,
			required: false
		},
		txid: {
			type: String,
			unique: true
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
	}
})

export default mongoose.model<PTx>('pendingTx', PendingTxSchema, 'pendingTxs')
