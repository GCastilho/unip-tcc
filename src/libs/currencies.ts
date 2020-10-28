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

/** Array de nomes das currencies suportadas */
export const currencyNames = currencies.map(currency => currency.name)

/** Tipo do nome de uma currency suportada */
export type SuportedCurrencies = typeof currencies[number]['name']

type CurrenciesObj = {
	[key in SuportedCurrencies]: Currency
}

export const currenciesObj = Object.fromEntries(
	currencies.map(currency => [currency.name, currency])
) as CurrenciesObj

/**
 * Faz a truncagem de um valor de acordo com as casas decimais de uma currrency.
 * Se a currency for inválida irá truncar para 0 casas decimais
 */
export function truncateAmount(amount: number, currency: string): number {
	const [integer, decimals] = amount.toLocaleString('fullwide', {
		useGrouping: false,
		maximumFractionDigits: 20
	}).split('.')
	return Number(`${integer}.${(decimals || '0').slice(0, currenciesObj[currency]?.decimals)}`)
}
