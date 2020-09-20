import assert from 'assert'
import { validate } from 'multicoin-address-validator'

/** Interface das informações e detalhes de uma currency */
interface Currency {
	name: string
	code: string
	decimals: number
	fee: number
	accountValidator: (accounts: string[]) => boolean
}

/** A quantidade de casas decimais MÁXIMA que o sistema opera */
const supportedDecimals = 8

/**
 * Cria uma instância, para uma currency específica, do validador de accounts,
 * que irá executar o validate do multicoin-address-validator para cada uma das
 * currencies do array de currencies informado
 *
 * @param currency A currency que será validada
 */
function createAccountsValidator(currency: Parameters<typeof validate>[1]) {
	return function(accounts: string[]) {
		return accounts.every(account => validate(account, currency, 'testnet'))
	}
}

export const currencies = [
	new class Bitcoin implements Currency {
		readonly name = 'bitcoin'
		readonly code = 'btc'
		readonly decimals = Math.min(supportedDecimals, 8)
		readonly fee = 0.000001
		readonly accountValidator = createAccountsValidator(this.name)
	}, new class Nano implements Currency {
		readonly name = 'nano'
		readonly code = 'nano'
		readonly decimals = Math.min(supportedDecimals, 30)
		readonly fee = 0.000001
		readonly accountValidator = createAccountsValidator(this.name)
	}
] as const

assert(
	currencies.every(currency => currency.decimals <= supportedDecimals),
	'A currency can not have decimal units higher than the supported by the system'
)

export type SuportedCurrencies = typeof currencies[number]['name']

export type CurrenciesObj = {
	[key in SuportedCurrencies]: Currency
}

export const currenciesObj = Object.fromEntries(
	currencies.map(currency => [currency.name, currency])
) as CurrenciesObj
