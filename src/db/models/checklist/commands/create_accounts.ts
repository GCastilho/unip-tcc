import { Schema } from 'mongoose'

export interface CreateAccountsInterface {
	status: 'requested'|'completed'
}

export const CreateAccountsSchema = new Schema({
	status: {
		type: String,
		enum: [ 'requested', 'completed' ],
		required: true
	}
})
