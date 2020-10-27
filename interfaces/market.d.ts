import type { SuportedCurrencies } from '../src/libs/currencies'

/** Interface de atualização de preço */
export interface PriceUpdate {
	/** Novo preço desse par */
	price: number
	/** O preço que está sendo modificado */
	type: 'buy'|'sell'
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

/** Interface de uma ordem de trade da MarketApi */
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

/** Interface do objeto de informação do depth do mercado */
export interface MarketDepth {
	price: number
	volume: number
	type: 'buy'|'sell'
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

/** Interface de um request das margens de preço de um mercado */
export interface MarketPrice {
	/** Preço da maior ordem de compra */
	buyPrice: number
	/** Preço da menor ordem de venda */
	sellPrice: number
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}
