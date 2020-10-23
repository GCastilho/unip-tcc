import mongoose, { Document, Schema } from '../mongoose'
import { currencyNames, SuportedCurrencies } from '../../libs/currencies'

/** Objeto de atualização de preço */
interface PriceChange extends Document {
	/** Novo preço desse par */
	price: number
	/** O preço que está sendo modificado */
	type: 'buy'|'sell'
	/** As currencies que fazem parte desse par */
	currencies: [SuportedCurrencies, SuportedCurrencies]
	/** O timestamp do momento que o dado foi inserido no DB */
	time: Date
}

const priceChangeSchema = new Schema({
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

priceChangeSchema.pre('save', function(this:PriceChange) {
	this.currencies = this.currencies.sort((a, b) => {
		return a > b ? 1 : a < b ? -1 : 0
	})
})

priceChangeSchema.virtual('time').get(function(this: PriceChange): PriceChange['time'] {
	return this._id.getTimestamp() as PriceChange['time']
})

const Price = mongoose.model<PriceChange>('priceChange', priceChangeSchema)

export default Price
