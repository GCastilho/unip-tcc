import { Decimal128 } from 'mongodb'
import { Schema, Document } from 'mongoose'
import { PendingSchema } from './pending'
import type { SchemaTypeOpts } from 'mongoose'
import type { Pending } from './pending'

/** A interface de uma currency da colletion people */
export interface Currency extends Document {
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

interface Validate {
	validator: SchemaTypeOpts.ValidateFn<Currency['accounts']>
	message: SchemaTypeOpts.ValidateOptsBase['message']
}

/**
 * Classe do Schema de uma currency genérica
 */
export class CurrencySchema extends Schema {
	constructor(decimals: number, validate: Validate) {
		super({
			balance: {
				available: {
					type: Decimal128,
					default: 0,
					validate: {
						validator: v => v >= 0,
						message: props => `Available balance can not be less than 0, found ${props.value}`
					}
				},
				locked: {
					type: Decimal128,
					default: 0,
					validate: {
						validator: v => v >= 0,
						message: props => `Locked balance can not be less than 0, found ${props.value}`
					}
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
				trim: true,
				validate
			},
			pending: {
				type: [PendingSchema]
			}
		}, {
			_id: false
		})

		// Faz a truncagem dos decimais
		this.pre('validate', function(this: Currency) {
			if (this.balance.available instanceof Decimal128)
				this.balance.available = this.balance.available.truncate(decimals)
			if (this.balance.locked instanceof Decimal128)
				this.balance.locked = this.balance.locked.truncate(decimals)
		})
	}
}
