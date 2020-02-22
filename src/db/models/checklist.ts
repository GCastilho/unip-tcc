import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * Checklist collection's interface
 */
export interface Checklist extends Document {
	opid: ObjectId
	userId: ObjectId
	command: 'create_account'|'withdraw'
	currency: 'nano'|'bitcoin'
	status: 'preparing'|'requested'|'completed'
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
	command: {
		type: String,
		enum: [ 'create_account', 'withdraw' ],
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
	}
})

export default mongoose.model<Checklist>('Checklist', ChecklistSchema)
