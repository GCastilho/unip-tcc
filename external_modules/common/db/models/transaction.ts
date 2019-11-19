import mongoose, { Document, Schema } from 'mongoose'

export interface Transaction extends Document {
	tx: string,
	info: any
}

const TransactionSchema = new Schema({
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
