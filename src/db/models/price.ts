import mongoose, { Document, Schema } from '../mongoose'
import { currencyNames, SuportedCurrencies } from '../../libs/currencies'

/** Objeto de uma modificaçao historica de preço */
export interface PriceDoc extends Document {
	/** Preço inicial da entrada */
	open: number,
	/** Preço final da entrada */
	close: number,
	/** Preço maximo no periodo de duraçao da entrada */
	high: number,
	/** Preço minimo no periodo de duraçao da entrada */
	low: number,
	/** a hora inicial do documento */
	startTime: number,
	/** o periodo(ms) ao qual o resumo de preço se refere*/
	duration: number,
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

const PriceSchema = new Schema({
	open: {
		type: Number,
		required: true
	},
	close:{
		type: Number,
		required: true
	},
	high: {
		type: Number,
		required: true
	},
	low: {
		type: Number,
		required: true
	},
	startTime:{
		type: Number,
		required: true
	},
	duration: {
		type : Date,
		required: false
	},
	currencies: {
		type: [String],
		required: true,
		validate: {
			validator: (currencies: SuportedCurrencies[]) => currencies.length == 2
				&& currencies.every(item => currencyNames.includes(item))
				&& currencies[0] != currencies[1],
			message: 'currencies lenght must be two and currency type must be a SuportedCurrencies',
		}
	}
})

PriceSchema.pre('save', function(this: PriceDoc) {
	this.currencies = this.currencies.sort((a, b) => {
		return a > b ? 1 : a < b ? -1 : 0
	})
})

const Price = mongoose.model<PriceDoc>('Price', PriceSchema, 'pricehistory')

export default Price
