import mongoose, { Document, Schema } from '../mongoose'
import { currencyNames, SuportedCurrencies } from '../../libs/currencies'

/** Objeto de uma modificaçao historica de preço */
export interface priceHistory extends Document {
	/** Preço inicial da entrada */
	initPrice: number,
	/** Preço final da entrada */
	finalPrice: number,
	/** Preço maximo no periodo de duraçao da entrada */
	maxPrice: number,
	/** Preço minimo no periodo de duraçao da entrada */
	minPrice: number,
	/** a hora inicial do documento */
	startTime: Date,
	/** a duraçao das entradas do*/
	duration: string,
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

const priceHistorySchema = new Schema({
	initPrice: {
		type: Number,
		required: true
	},
	finalPrice:{
		type: Number,
		required: true
	},
	maxPrice: {
		type: Number,
		required: true
	},
	minPrice: {
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

priceHistorySchema.pre('save', function(this: priceHistory) {
	this.currencies = this.currencies.sort((a, b) => {
		return a > b ? 1 : a < b ? -1 : 0
	})
})
priceHistorySchema.virtual('startTime').get(function(this: priceHistory): priceHistory['startTime'] {
	return this._id.getTimestamp() as priceHistory['startTime']
})
const PriceHistory = mongoose.model<priceHistory>('priceHistory', priceHistorySchema, 'pricehistory')

export default PriceHistory
