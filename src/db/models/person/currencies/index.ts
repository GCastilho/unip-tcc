/*
 * Exporta um schema com cada propriedade sendo um schema de uma currency
 * individual suportada
 */

import { Schema, Document } from 'mongoose'
import { CurrencySchema } from './currencySchema'
import { detailsOf } from '../../../../currencyApi'
import * as WAValidator from 'multicoin-address-validator'
import type { Currency } from './currencySchema'

/**
 * A interface do sub-documento 'currencies' da collection people
 */
export interface Currencies extends Document {
	bitcoin: Currency
	nano: Currency
}

/*
 * Schema das currencies individuais
 */
const Bitcoin = new CurrencySchema(detailsOf('bitcoin').decimals, {
	validator: (accounts: string[]) => {
		return accounts.every((account) => WAValidator.validate(account, 'bitcoin', 'testnet'))
	},
	message: 'Invalid bitcoin account address'
})

const Nano = new CurrencySchema(detailsOf('nano').decimals, {
	validator: (accounts: string[]) => {
		return accounts.every((account) => WAValidator.validate(account, 'nano', 'testnet'))
	},
	message: 'Invalid nano account address'
})

/**
 * Sub-schema 'currencies' do Schema Person
 */
const CurrenciesSchema = new Schema({
	nano: Nano,
	bitcoin: Bitcoin
}, {
	_id: false,
})

CurrenciesSchema.pre('validate', function(this: Currencies) {
	// Ao criar o documento, as props dos sub-schemas serão undefined
	for (const currency of Object.keys(CurrenciesSchema.obj)) {
		if (typeof this[currency] == 'undefined')
			this[currency] = {}
	}
})

export default CurrenciesSchema
