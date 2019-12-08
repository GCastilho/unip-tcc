import mongoose, { Document, Schema } from 'mongoose'
import { Transaction as Tx } from '../../../common'
import { ObjectId } from 'bson'

export interface Transaction extends Document {
	opid: Tx['opid'],
	account: Tx['account'],
	txid: Tx['txid']
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
