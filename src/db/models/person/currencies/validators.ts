/**
 * Cada objeto é um objeto 'validator' do mongoose
 * 
 * @see https://mongoosejs.com/docs/api.html#schematype_SchemaType-validate
 */

import * as WAValidator from 'multicoin-address-validator'

export const bitcoin = {
	validator: function bitcoin_account_validator(accounts: string[]) {
		return accounts.every((account) => WAValidator.validate(account, 'bitcoin', 'testnet'))
	},
	message: 'Invalid bitcoin account address'
}

export const nano = {
	validator: function nano_account_validator(accounts: string[]) {
		return accounts.every((account) => WAValidator.validate(account, 'nano', 'testnet'))
	},
	message: 'Invalid nano account address'
}
