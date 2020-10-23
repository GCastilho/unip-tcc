import mongoose, { Document, Schema } from '../mongoose'
import { currencyNames, SuportedCurrencies } from '../../libs/currencies'

/** Objeto de uma modificaçao historica de preço */
interface priceHistory extends Document {
	iniPrice: number,
	finalPrice: number,
	maxPrice: number,
	minPrice: number,
	startTime: Date,
	duration: string, //for now, it will be change verry soon (probably)
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

const priceHistorySchema = new Schema({
	iniPrice: {
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
	startTime: {
		type : Date,
		required: false
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
const PriceHistory = mongoose.model<priceHistory>('priceHistory', priceHistorySchema, 'pricehistory')

export default PriceHistory
