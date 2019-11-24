/*
 * Módulo para interfaces e schemas comuns para todas as currencies
 */

import mongoose, { Schema } from 'mongoose'
import * as validators from './validators'
import { Decimal128 } from 'bson'

/**
 * @deprecated Essa schema será removida da collection people qdo a nova
 * implementação do sistema de salvar transações estiver pronta
 */
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

/**
 * Schema das operações (que involvem alteração de saldo) pendentes desse
 * usuário, uma vez concluídas elas devem ser removidas da collection
 */
const PendingSchema: Schema = new Schema({
	opid: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	amount: {
		type: Decimal128,
		required: true
	}
})

/**
 * Schema de cada uma das currencies da collection people, haverá um
 * sub-documento desse schema para cada currency
 */
const CurrencySchema: Schema = new Schema({
	balance: {
		type: Decimal128,
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
	/**
	 * @deprecated As transações recebidas serão removidas da collection people
	 */
	received: {
		type: [TransactionSchema]
	},
	/**
	 * @deprecated As transações enviadas serão removidas da collection people
	 */
	sended: {
		type: [TransactionSchema]
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
