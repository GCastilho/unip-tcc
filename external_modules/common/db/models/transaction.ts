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

/*
 * Compound index to allow the storing of a send and a receive transaction
 * with the same txid
 *
 * Tbm é uma boa ideia desabilitar o autoIndex em produção
 *
 * See https://mongoosejs.com/docs/guide.html#indexes
 */
TransactionSchema.index({
	txid: 1,
	type: 1
}, {
	unique: true
})

export default mongoose.model<Transaction>('transaction', TransactionSchema)
