/*
 * Esse módulo exporta um schema com cada propriedade sendo um schema de uma
 * currency individual suportada
 */

import { Schema } from 'mongoose'
import { CurrencySchema } from './generic'
import * as validators from './validators'
import type { Currency } from './generic'

/**
 * A interface do sub-documento 'currencies' da collection people
 */
export interface Currencies {
	bitcoin: Currency
	nano: Currency
}

/*
 * Adiciona a função de validação de address na currency e monta o novo schema
 */
export const Bitcoin: Schema = new Schema({
	...CurrencySchema.obj,
	accounts: {
		...CurrencySchema.obj.accounts,
		validate: validators.bitcoin
	}
})

export const Nano: Schema = new Schema({
	...CurrencySchema.obj,
	accounts: {
		...CurrencySchema.obj.accounts,
		validate: validators.nano
	}
})

/**
 * Sub-schema 'currencies' do Schema Person
 */
const CurrenciesSchema: Schema = new Schema({
	nano: Nano.obj,
	bitcoin: Bitcoin.obj
})

export default CurrenciesSchema
