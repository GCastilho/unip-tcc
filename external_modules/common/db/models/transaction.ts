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
//compound index to allow the storing of a send and a receive transaction
TransactionSchema.index({
	txid: 1,
	type: 1
}, {
	unique: true
})
//mongodb recomends to turn off autoIndex for optimization
TransactionSchema.set('autoIndex', false)

export default mongoose.model<Transaction>('transaction', TransactionSchema)
