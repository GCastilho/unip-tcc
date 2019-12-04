import mongoose, { Schema, Document } from 'mongoose'
import { Transaction as ITransaction } from '../../../common'
import { ObjectId } from 'bson'

export interface unconfirmedTx extends Document {
	opid: ITransaction['opid'],
	txid: string,
	confirmations: number
}

const unconfirmedTxSchema = new Schema({
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
	confirmations: {
		type: Number,
		default: 0,
		required: true
	}
})

export default mongoose.model<unconfirmedTx>('unconfirmedTx', unconfirmedTxSchema, 'unconfirmedTxs')
