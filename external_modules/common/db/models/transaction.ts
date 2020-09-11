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
		required: false
	},
	txid: {
		type: String,
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

/* Faz o index existir apenas se tiver um opid */
TransactionSchema.index({
	opid: 1
}, {
	unique: true,
	partialFilterExpression: {
		opid: { $exists: true }
	}
})

/*
 * Faz o index composto do txid e type existir apenas caso o txid não seja nulo
 */
TransactionSchema.index({
	txid: 1,
	type: 1
}, {
	unique: true,
	partialFilterExpression: {
		txid: { $exists: true }
	}
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
