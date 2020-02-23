import { Schema } from 'mongoose'
import { Decimal128 } from 'mongodb'
import { PendingSchema } from './pending'
import type { Pending } from './pending'

/** A interface de uma currency da colletion people */
export interface Currency {
	balance: {
		/** Saldo disponível para operações */
		available: Decimal128
		/** Saldo bloqueado em operações */
		locked: Decimal128
	}
	/** Array de accounts de <currency> do usuário */
	accounts: string[]
	/** Operações pendentes que involvem alteração de saldo */
	pending: Pending[]
}

/**
 * Schema de cada uma das currencies da collection people, haverá um
 * sub-documento desse schema para cada currency
 */
export const CurrencySchema: Schema = new Schema({
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
