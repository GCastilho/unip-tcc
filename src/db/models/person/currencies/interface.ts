/**
 * A interface das transactions da collection people
 */
export interface Transaction {
	txid: string,
	account: string,
	amount: number
	timestamp: Date
}

/**
 * A interface de uma currency da colletion people
 */
export interface Currency {
	balance: number,
	accounts: string[]
	received: Transaction[]
	sended: Transaction[]
}

/**
 * A interface do sub-documento 'currencies' da collection people
 */
export interface Currencies {
	bitcoin: Currency,
	nano: Currency
}
