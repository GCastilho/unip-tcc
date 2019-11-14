import mongoose, { Schema, Document } from 'mongoose'

export interface IAccount extends Document {
	account: string,
	lastBlock: string
}

const Account: Schema = new Schema({
	account: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	lastBlock: {
		type: String,
		trim: true
	}
})

export default mongoose.model<IAccount>('account', Account)
