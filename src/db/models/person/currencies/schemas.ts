/*
 * Módulo para interfaces e schemas comuns para todas as currencies
 */

import { Schema } from 'mongoose'
import * as validators from './validators'
import { CurrencySchema } from './generic'

/*
 * Adiciona a função de validação de address na currency e monta o novo schema
 */
CurrencySchema.obj.accounts.validade = validators.bitcoin
export const Bitcoin: Schema = new Schema(CurrencySchema.obj)

CurrencySchema.obj.accounts.validade = validators.nano
export const Nano: Schema = new Schema(CurrencySchema.obj)
