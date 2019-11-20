import * as WAValidator from 'multicoin-address-validator'
import { CurrencySchema } from './common'
import { Schema } from 'mongoose'

CurrencySchema.obj.accounts.validate = {
	validator: function nano_account_validator(accounts: string[]) {
		return accounts.every((account) => WAValidator.validate(account, 'nano', 'testnet'))
	},
	message: 'Invalid nano account address'
}

const Nano: Schema = new Schema(CurrencySchema.obj)

export = Nano
