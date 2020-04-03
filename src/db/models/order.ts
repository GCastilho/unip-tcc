import mongoose, { Document, Schema } from '../mongoose'
import { ObjectId, Decimal128 } from 'mongodb'
import type { SuportedCurrencies as SC } from '../../currencyApi'

interface OrderBook extends Document {
	userId: ObjectId
	currency: {
		base: SC
		target: SC
	}
	price: number
	amount: Decimal128
	total: Decimal128
	timestamp: Date
}

const OrderSchema = new Schema({
	userId: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	currency: {
		base: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true
		},
		target: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true
		}
	},
	price: {
		type: Decimal128,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive number`
		}
	},
	amount: {
		type: Decimal128,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive number`
		}
	},
	total: {
		type: Decimal128,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive number`
		}
	},
	timestamp: {
		type: Date,
		required: true
	}
})

export default mongoose.model<OrderBook>('Order', OrderSchema, 'orderbook')
