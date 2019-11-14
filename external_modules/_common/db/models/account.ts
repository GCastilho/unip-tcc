import mongoose, { Schema, Document } from 'mongoose'

export interface IAccount extends Document {
	account: string
}

const Account: Schema = new Schema({
	account: {
		type: String,
		trim: true,
		unique: true,
		required: true
	}
})

export default mongoose.model<IAccount>('account', Account)
