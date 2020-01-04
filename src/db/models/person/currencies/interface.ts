import { Decimal128, ObjectId } from 'mongodb'

/** A interface de operações de alteração de saldo pendentes*/
export interface Pending {
	/**
	 * Referencia ao objectId da operação em sua respectiva collection
	 */
	opid: ObjectId,
	/**
	 * O tipo da operação, para identificar em qual collection ela está
	 */
	type: 'transaction',
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: Decimal128
}

/** A interface de uma currency da colletion people */
interface Currency {
	balance: {
		/** Saldo disponível para operações */
		available: Decimal128,
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
	bitcoin: Currency,
	nano: Currency
}
