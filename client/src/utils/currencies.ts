import type { Currencies } from '../routes/currencies'

export const resourceUrl = '/currencies'

const currencies = {} as Currencies

/**
 * Inicializa o módulo de currencies do cliente; Deve ser chamado no _layout
 * global. Chamar no preload faz ele ser inicializado no servidor também
 */
export function init(data: Currencies) {
	for (const currency in data) {
		currencies[currency] = data[currency]
	}
}

export default currencies
