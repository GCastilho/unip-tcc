import { Decimal128 } from 'mongodb'
import { Pending } from './pending'

/** A interface de uma currency da colletion people */
interface Currency {
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
 * A interface do sub-documento 'currencies' da collection people
 */
export interface Currencies {
	bitcoin: Currency
	nano: Currency
}
