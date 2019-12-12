import { Schema } from 'mongoose'
import { ObjectId } from 'bson'

export interface WithdrawInterface {
	status: 'preparing'|'requested'|'completed',
	opid: ObjectId
}

export const WithdrawSchema = new Schema({
	status: {
		type: String,
		required: true
	},
	opid: {
		type: ObjectId,
		required: true
	}
})
