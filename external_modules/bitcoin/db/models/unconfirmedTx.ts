import mongoose, { Schema, Document } from 'mongoose'

export interface unconfirmedTx extends Document {
	txid: string,
	confirmations: number
}

const unconfirmedTxSchema = new Schema({
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

export default mongoose.model<unconfirmedTx>('unconfirmedTx', unconfirmedTxSchema)
