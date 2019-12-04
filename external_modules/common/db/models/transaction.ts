import mongoose, { Document, Schema } from 'mongoose'
import { ObjectId } from 'bson'

export interface Transaction extends Document {
	opid: ObjectId,
	tx: string,
	info: any
}

const TransactionSchema = new Schema({
	opid: {
		type: ObjectId,
		unique: true,
		required: false,
	},
	txid: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	info: {
		type: Object
	}
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
