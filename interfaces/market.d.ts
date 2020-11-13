import type { SuportedCurrencies } from '../src/libs/currencies'

/** Interface do request de uma ordem de trade da MarketApi */
export interface OrderRequest {
	owning: {
		currency: SuportedCurrencies
		amount: number
	}
	requesting: {
		currency: SuportedCurrencies
		amount: number
	}
	timestamp: number
}

/** Type do request de uma ordem já informada à MarketApi */
export interface MarketOrder extends OrderRequest {
	opid: string
}

/** Interface de um request das margens de preço de um mercado */
export interface PriceRequest {
	/** Preço da maior ordem de compra */
	buyPrice: number
	/** Preço da menor ordem de venda */
	sellPrice: number
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

/** Interface de atualização de preço */
export interface PriceUpdate {
	/** Novo preço desse par */
	price: number
	/** O preço que está sendo modificado */
	type: 'buy'|'sell'
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

/** Interface do objeto de informação do depth do mercado */
export interface MarketDepth {
	price: number
	volume: number
	type: 'buy'|'sell'
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

/** Interface do evento de atualização de uma ordem */
export type OrderUpdate = {
	/** O id da ordem no orderbook */
	opid: string
} & ({
	/** O status da ordem após a atualização */
	status: 'close'|'cancelled'
} | {
	/** Status da ordem após ela ser completada parcialmente */
	status: 'open'
	/** Os amounts que a ordem foi parcialmente completada */
	completed: {
		/** Quando do owning dessa ordem foi executado */
		owning: number
		/** Quando do requesting dessa ordem foi executado */
		requesting: number
	}
})

/** Interface de uma candle do gráfico de preço */
export interface PriceHistory {
	/** Preço inicial da entrada */
	open: number
	/** Preço final da entrada */
	close: number
	/** Preço maximo no periodo de duraçao da entrada */
	high: number
	/** Preço minimo no periodo de duraçao da entrada */
	low: number
	/** a hora inicial do documento */
	startTime: number
	/** o periodo(ms) ao qual o resumo de preço se refere*/
	duration: number
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]

	'adj close'?: number
	volume?: number
}

/** Interface de uma ordem de trade já executada */
export interface MarketTrade {
	/** Identificador único dessa ordem de trade */
	opid: string
	/** As currencies que fazem parte dessa trade */
	currencies: [SuportedCurrencies, SuportedCurrencies]
	/** O preço dessa ordem */
	price: number
	/** O quanto o usuário comprou/vendeu nessa operação */
	amount: number
	/** Quanto o usuário pagou de fee por essa operação */
	fee: number
	/** O quanto o usuário pagou/recebeu nessa operação */
	total: number
	/** O timestamp de quando essa operação foi executada */
	timestamp: number
}
