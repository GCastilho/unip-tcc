/*
 * Módulo para interfaces e schemas comuns para todas as currencies
 */

import { Schema } from 'mongoose'

export interface Transaction {
	txid: string,
	account: string,
	amount: number
	timestamp: Date
}

export interface Currency {
	balance: number,
	accounts: string[]
	received: Transaction[]
	sended: Transaction[]
}

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

export const CurrencySchema: Schema = new Schema({
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
