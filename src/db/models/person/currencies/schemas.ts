/*
 * Módulo para interfaces e schemas comuns para todas as currencies
 */

import { Schema } from 'mongoose'
import * as validators from './validators'
import { Decimal128 } from 'mongodb'
import { PendingSchema } from './pending'

/**
 * Schema de cada uma das currencies da collection people, haverá um
 * sub-documento desse schema para cada currency
 */
const CurrencySchema: Schema = new Schema({
	balance: {
		available: {
			type: Decimal128,
			default: 0,
			min: [0, 'Available balance can not be less than 0']
		},
		locked: {
			type: Decimal128,
			default: 0,
			min: [0, 'Locked balance can not be less than 0']
		}
	},
	accounts: {
		type: [String],
		/**
		 * @todo Como o sparse não funciona em indices compostos, fazer uma
		 * função de validação personalizada que verifica se o novo endereço
		 * é de fato único
		 */
		// sparse: true,
		// unique: true,
		trim: true
	},
	pending: {
		type: [PendingSchema]
	}
})

/*
 * Adiciona a função de validação de address na currency e monta o novo schema
 */
CurrencySchema.obj.accounts.validade = validators.bitcoin
export const Bitcoin: Schema = new Schema(CurrencySchema.obj)

CurrencySchema.obj.accounts.validade = validators.nano
export const Nano: Schema = new Schema(CurrencySchema.obj)
