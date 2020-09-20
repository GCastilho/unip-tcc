import { ObjectId } from 'mongodb'
import mongoose, { Schema, Document } from '../mongoose'
import { currencies } from '../../libs/currencies'
import type { SuportedCurrencies } from '../../libs/currencies'

/**
 * Checklist collection's interface
 */
export interface Checklist extends Document {
	opid: ObjectId
	userId: ObjectId
	currency: SuportedCurrencies
	command: 'create_account'|'withdraw'|'cancell_withdraw'
	status: 'preparing'|'requested'|'completed'|'cancelled'
}

const ChecklistSchema = new Schema({
	opid: {
		type: ObjectId,
		required: true
	},
	userId: {
		type: ObjectId,
		required: true
	},
	currency: {
		type: String,
		enum: currencies.map(currency => currency.name),
		required: true
	},
	command: {
		type: String,
		enum: ['create_account', 'withdraw', 'cancell_withdraw'],
		required: true
	},
	status: {
		type: String,
		enum: ['preparing', 'requested', 'completed', 'cancelled'],
		required: true
	}
})

export default mongoose.model<Checklist>('Checklist', ChecklistSchema)
