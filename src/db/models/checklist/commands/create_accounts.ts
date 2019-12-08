import { Schema } from 'mongoose'

export interface CreateAccountsInterface {
	status: string,
	accounts_before: number,
	accounts_after: number
}

export const CreateAccountsSchema = new Schema({
	status: {
		type: String,
		required: true
	},
	accounts_before: {
		type: Number,
		required: true
	},
	accounts_after: {
		type: Number,
		required: true
	},
})
