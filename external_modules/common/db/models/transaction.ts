import mongoose, { Document, Schema } from 'mongoose'
import { ObjectId } from 'bson'

export interface Transaction extends Document {
	opid: ObjectId,
	account: string,
	txid: string
}

const TransactionSchema = new Schema({
	opid: {
		type: ObjectId,
		unique: true,
		required: false,
	},
	account: {
		type: String,
		required: true
	},
	txid: {
		type: String,
		trim: true,
		unique: true,
		required: true
	}
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
