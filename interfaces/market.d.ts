import type { SuportedCurrencies } from '../src/libs/currencies'

/** Objeto de atualização de preço */
export interface PriceUpdate {
	/** Novo preço desse par */
	price: number
	/** O preço que está sendo modificado */
	type: 'buy'|'sell'
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}
