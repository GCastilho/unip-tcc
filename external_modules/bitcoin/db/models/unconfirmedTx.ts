import mongoose, { Schema, Document } from '../../../common/node_modules/mongoose'
import { Transaction as Tx } from '../../../common'
import { ObjectId } from 'bson'

export interface UnconfirmedTx extends Document {
	opid: Tx['opid'],
	txid: string,
	account: Tx['account'],
	confirmations: number
}

const UnconfirmedTxSchema: Schema = new Schema({
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
	account: {
		type: String,
		required: true
	},
	confirmations: {
		type: Number,
		default: 0,
		required: true
	}
})

export default mongoose.model<UnconfirmedTx>('unconfirmedTx', UnconfirmedTxSchema, 'unconfirmedTxs')
