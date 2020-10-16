import { Schema, Document } from 'mongoose'
import CurrencySchema from './currencySchema'
import { currencies } from '../../../../libs/currencies'
import type { SuportedCurrencies } from '../../../../libs/currencies'
import type { Currency } from './currencySchema'

/**
 * O type do schema do sub-documento 'currencies' da collection people
 */
export type Currencies = {
	[key in SuportedCurrencies]: Currency
}

/**
 * Instância do sub-schema 'currencies' do Schema da Person
 */
const CurrenciesSchema = new Schema<Currencies & Document>(
	Object.fromEntries(
		currencies.map(currency => [
			currency.name,
			new CurrencySchema(
				currency.name,
				currency.decimals,
				currency.accountValidator
			)
		])
	), {
		_id: false
	}
)

CurrenciesSchema.pre('validate', function(this: Currencies & Document) {
	// Ao criar o documento, as props dos sub-schemas serão undefined
	if (!this.isNew) return
	for (const currency of Object.keys(CurrenciesSchema.obj)) {
		if (typeof this[currency] == 'undefined')
			this[currency] = {}
	}
})

/**
 * Exporta um schema com cada propriedade sendo um schema de uma currency
 * individual suportada
 */
export default CurrenciesSchema
