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

/** Objeto de uma ordem de trade da MarketApi */
export interface MarketOrder {
	owning: {
		currency: SuportedCurrencies
		amount: number
	}
	requesting: {
		currency: SuportedCurrencies
		amount: number
	}
}

/** Objeto de informação do depth do mercado */
export interface MarketDepth {
	price: number
	volume: number
	type: 'buy'|'sell'
	currencies: [SuportedCurrencies, SuportedCurrencies]
}
