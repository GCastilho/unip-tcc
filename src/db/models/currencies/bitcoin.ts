import * as WAValidator from 'multicoin-address-validator'
import { CurrencySchema } from './common'
import { Schema } from 'mongoose'

const Bitcoin: Schema = new Schema({...CurrencySchema.obj, ...{
	account: {
		validate: [function bitcoin_account_validator(accounts: string[]) {
			return accounts.every((account) => WAValidator.validate(account, 'bitcoin'))
		}, 'Invalid bitcoin account address']
	}
}})

export = Bitcoin
