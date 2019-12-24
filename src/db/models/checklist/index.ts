import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId } from 'mongodb'
import { CreateAccountsSchema, CreateAccountsInterface } from './commands/create_accounts'
import { WithdrawSchema, WithdrawInterface } from './commands/withdraw'

export interface Checklist extends Document {
	userId: ObjectId,
	commands: {
		create_accounts: {
			bitcoin: CreateAccountsInterface,
			nano: CreateAccountsInterface
		},
		withdraw: {
			bitcoin: WithdrawInterface[],
			nano: WithdrawInterface[]
		}
	}
}

const ChecklistSchema = new Schema({
	userId: {
		type: ObjectId,
		required: true,
		unique: true
	},
	commands: {
		create_accounts: {
			bitcoin: CreateAccountsSchema,
			nano: CreateAccountsSchema
		},
		withdraw: {
			bitcoin: [WithdrawSchema],
			nano: [WithdrawSchema]
		}
	}
})

export default mongoose.model<Checklist>('Checklist', ChecklistSchema)
