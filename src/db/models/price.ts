import mongoose, { Document, Schema } from '../mongoose'
import { currencyNames, SuportedCurrencies } from '../../libs/currencies'

/** Objeto de atualização de preço */
interface PriceUpdate extends Document {
	/** Novo preço desse par */
	price: number
	/** O preço que está sendo modificado */
	type: 'buy'|'sell'
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
}

const priceUpdateSchema = new Schema({
	price: {
		type: Number,
		required: true
	},
	type: {
		type: String,
		enum: ['buy', 'sell'],
		required: true
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

priceUpdateSchema.pre('save', function(this:PriceUpdate) {
	this.currencies = this.currencies.sort((a, b) => {
		return a > b ? 1 : a < b ? -1 : 0
	})
})

const Price = mongoose.model<PriceUpdate>('price', priceUpdateSchema)

export default Price
