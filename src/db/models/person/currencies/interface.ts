import mongoose from 'mongoose'
import { Decimal128 } from 'bson'

/**
 * A interface das transactions da collection people
 * 
 * @deprecated Essa interface não ficará mais nessa collection
 */
export interface Transaction {
	txid: string,
	account: string,
	amount: number
	timestamp: Date
}

export interface Pending {
	/**
	 * O objectId da operação em sua respectiva collection
	 */
	opid: mongoose.Types.ObjectId,
	/**
	 * O tipo da operação, para identificar em qual collection ela está
	 */
	type: string,
	/**
	 * O amount da operação. Positivo se é uma operação que aumenta o saldo do
	 * usuário e negativo caso seja uma operação que reduzirá seu saldo
	 */
	amount: Decimal128
}

/**
 * A interface de uma currency da colletion people
 */
export interface Currency {
	balance: number,
	/**
	 * Array de accounts de <currency> do usuário
	 */
	accounts: string[]
	/**
	 * @deprecated As transações recebidas serão removidas da collection people
	 */
	received: Transaction[]
	/**
	 * @deprecated As transações enviadas serão removidas da collection people
	 */
	sended: Transaction[],
	/**
	 * Operações pendentes que involvem alteração de saldo
	 */
	pending: Pending[]
}

/**
 * A interface do sub-documento 'currencies' da collection people
 */
export interface Currencies {
	bitcoin: Currency,
	nano: Currency
}
