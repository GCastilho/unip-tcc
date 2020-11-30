import type { Currencies } from '../routes/currencies'

const currencies = {} as Currencies

/**
 * Inicializa o módulo de currencies do cliente; Deve ser chamado
 * em um preload global
 */
export function init(data: Currencies) {
	for (const currency in data) {
		currencies[currency] = data[currency]
	}
}

export default currencies
