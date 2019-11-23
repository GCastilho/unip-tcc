/*
 * Esse módulo exporta um schema com cada propriedade sendo um schema de uma
 * currency individual suportada
 */

import { Schema } from 'mongoose'
import * as schemas from './schemas'

const CurrenciesSchema: Schema = new Schema({
	nano: schemas.Nano,
	bitcoin: schemas.Bitcoin
})

export default CurrenciesSchema
