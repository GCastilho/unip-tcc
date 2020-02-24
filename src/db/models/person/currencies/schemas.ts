/*
 * Módulo para interfaces e schemas comuns para todas as currencies
 */

import { Schema } from 'mongoose'
import * as validators from './validators'
import { CurrencySchema } from './generic'

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
