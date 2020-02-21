import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * Checklist collection's interface
 */
export interface Checklist extends Document {
	opid: ObjectId,
	userId: ObjectId,
	currency: 'nano'|'bitcoin',
	status: 'preparing'|'requested'|'completed',
	command: 'create_accounts'|'withdraw',
}

const ChecklistSchema = new Schema({
	opid: {
		type: ObjectId,
		unique: true,
		required: true
	},
	userId: {
		type: ObjectId,
		required: true
	},
	currency: {
		type: String,
		enum: [ 'nano', 'bitcoin' ],
		required: true
	},
	status: {
		type: String,
		enum: [ 'preparing', 'requested', 'completed' ],
		required: true
	},
	command: {
		type: String,
		enum: [ 'create_accounts', 'withdraw' ],
		required: true
	}
})

export default mongoose.model<Checklist>('Checklist', ChecklistSchema)
