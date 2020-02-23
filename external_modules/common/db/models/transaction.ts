import mongoose, { Document, Schema } from 'mongoose'
import { ObjectId } from 'mongodb'

export interface Transaction extends Document {
	opid: ObjectId
	txid: string
	account: string
	type: 'send'|'receive'
}

const TransactionSchema = new Schema({
	opid: {
		type: ObjectId,
		unique: true,
		required: false,
	},
	txid: {
		type: String,
		unique: true,
		sparse: true,
		required: false
	},
	account: {
		type: String,
		required: true
	},
	type: {
		type: String,
		enum: ['send', 'receive'],
		required: true
	}
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
