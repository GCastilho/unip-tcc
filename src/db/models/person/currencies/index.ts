/*
 * Esse módulo exporta um schema com cada propriedade sendo um schema de uma
 * currency individual suportada
 */

import { Schema, Document } from 'mongoose'
import { CurrencySchema } from './generic'
import { detailsOf } from '../../../../currencyApi'
import * as validators from './validators'
import type { Currency } from './generic'

/**
 * A interface do sub-documento 'currencies' da collection people
 */
export interface Currencies extends Document {
	bitcoin: Currency
	nano: Currency
}

/*
 * Adiciona a função de validação de address na currency e monta o novo schema
 */
export const Bitcoin = new CurrencySchema(detailsOf('bitcoin').decimals, validators.bitcoin)

export const Nano = new CurrencySchema(detailsOf('nano').decimals, validators.nano)

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
