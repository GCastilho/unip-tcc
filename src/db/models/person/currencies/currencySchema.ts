import { Decimal128 } from 'mongodb'
import { Schema, Document } from 'mongoose'
import { PendingSchema } from './pending'
import { detailsOf } from '../../../../currencyApi'
import type { SchemaTypeOpts } from 'mongoose'
import type { Pending } from './pending'
import type { SuportedCurrencies as SC } from '../../../../currencyApi'

/** A interface de uma currency genérica */
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

/** Objeto validate usado para implementação de validação pela CurrencySchema */
interface Validate {
	validator: SchemaTypeOpts.ValidateFn<Currency['accounts']>
	message: SchemaTypeOpts.ValidateOptsBase['message']
}

/**
 * Classe do Schema de uma currency genérica
 */
export class CurrencySchema extends Schema {
	constructor(currency: SC, validate: Validate) {
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
				trim: true,
				validate
			},
			pending: {
				type: [PendingSchema]
			}
		}, {
			_id: false
		})

		const { decimals } = detailsOf(currency)

		// Faz a truncagem dos decimais
		this.pre('validate', function(this: Currency) {
			if (this.balance.available instanceof Decimal128)
				this.balance.available = this.balance.available.truncate(decimals)
			if (this.balance.locked instanceof Decimal128)
				this.balance.locked = this.balance.locked.truncate(decimals)
		})

		// Garante que não há accunts repetidas nesse documento
		this.pre('validate', function(this: Currency) {
			const uniqueAccounts = new Set()
			this.accounts.forEach(account => uniqueAccounts.add(account))
			if (uniqueAccounts.size != this.accounts.length)
				throw 'New account can not be equal to existing account'
		})
	}
}
