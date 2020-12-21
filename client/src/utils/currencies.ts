import type { SuportedCurrencies } from '../../../src/libs/currencies'
export const resourceUrl = '/currencies'

/** O type do objeto armazenado nesse módulo */
export type Currencies = {
	[key in SuportedCurrencies]: {
		code: string
		decimals: number
		fee: number
	}
}

const currencies = {} as Currencies

/**
 * Inicializa o módulo de currencies do cliente; Deve ser chamado antes do
 * sapper ser carregado no servidor e no cliente
 */
export function init(data: Currencies) {
	for (const currency in data) {
		currencies[currency] = data[currency]
	}
}

export default currencies
