import { Schema } from 'mongoose'

export interface WithdrawInterface {
	status: string,
	address: string,
	amount: number,
	balance_before: number
}

export const WithdrawSchema = new Schema({
	status: {
		type: String,
		required: true
	},
	address: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true
	},
	balance_before: {
		type: Number,
		required: true
	}
})
