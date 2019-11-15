import * as WAValidator from 'multicoin-address-validator'
import { CurrencySchema } from './common'
import { Schema } from 'mongoose'

const Nano: Schema = new Schema({...CurrencySchema.obj, ...{
	account: {
		validate: [function nano_account_validator(accounts: string[]) {
			return accounts.every((account) => WAValidator.validate(account, 'nano', 'testnet'))
		}, 'Invalid bitcoin account address']
	}
}})

export = Nano
