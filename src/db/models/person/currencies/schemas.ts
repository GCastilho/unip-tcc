/*
 * Módulo para interfaces e schemas comuns para todas as currencies
 */

import { Schema } from 'mongoose'
import * as validators from './validators'

const TransactionSchema: Schema = new Schema({
	txid: {
		type: String,
		required: true,
		// unique: true
	},
	account: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true
	},
	timestamp: {
		type: Date,
		required: true
	}
})

const CurrencySchema: Schema = new Schema({
	balance: {
		type: Number,
		default: 0
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
	received: {
		type: [TransactionSchema]
	},
	sended: {
		type: [TransactionSchema]
	}
})

/*
 * Adiciona a função de validação de address na currency e monta o novo schema
 */
CurrencySchema.obj.accounts.validade = validators.bitcoin
export const Bitcoin: Schema = new Schema(CurrencySchema.obj)

CurrencySchema.obj.accounts.validade = validators.nano
export const Nano: Schema = new Schema(CurrencySchema.obj)
