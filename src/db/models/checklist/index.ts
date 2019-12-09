import mongoose, { Schema, Document } from 'mongoose'
import { ObjectId } from 'bson'
import { CreateAccountsSchema, CreateAccountsInterface } from './commands/create_accounts'
import { WithdrawSchema, WithdrawInterface } from './commands/withdraw'

interface Checklist extends Document {
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
			bitcoin: CreateAccountsSchema.obj,
			nano: CreateAccountsSchema.obj
		},
		withdraw: {
			bitcoin: [WithdrawSchema.obj],
			nano: [WithdrawSchema.obj]
		}
	}
})

export = mongoose.model<Checklist>('Checklist', ChecklistSchema)
