import * as WAValidator from 'multicoin-address-validator'
import { CurrencySchema } from './common'
import { Schema } from 'mongoose'

CurrencySchema.obj.accounts.validate = {
	validator: function bitcoin_account_validator(accounts: string[]) {
		return accounts.every((account) => WAValidator.validate(account, 'bitcoin', 'testnet'))
	},
	message: 'Invalid bitcoin account address'
}

const Bitcoin: Schema = new Schema(CurrencySchema.obj)

export = Bitcoin
