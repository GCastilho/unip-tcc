/*
 * Esse módulo exporta um schema com cada propriedade sendo o schema de uma
 * currency individual suportada. O Schema base é definido na common, sendo
 * expandido nos módulos individuais
 */

import { Schema } from 'mongoose'
import { Currency } from './common'
import Bitcoin from './bitcoin'
import Nano from './nano'

export interface CurrenciesSchema {
	bitcoin: Currency,
	nano: Currency
}

const CurrenciesSchema: Schema = new Schema({
	nano: Nano,
	bitcoin: Bitcoin
})

export default CurrenciesSchema
