import mongoose, { Document, Schema } from '../mongoose'
import { ObjectId, Decimal128 } from 'mongodb'
import type { SuportedCurrencies as SC } from '../../currencyApi'

interface OrderBook extends Document {
	/** ID do usuário dono dessa ordem */
	userId: ObjectId
	/**
	 * Status da operação
	 *
	 * preparing: A ordem está na MarketApi, que ainda está processando-a
	 * ready: A ordem está pronta para ser executada
	 */
	status: 'preparing'|'ready'
	/** Se essa ordem está comprando ou vendendo target */
	type: 'buy'|'sell'
	/** As currencies envolvidas nessa ordem */
	currency: {
		/** A currency base para cálculo do preço */
		base: SC
		/** A currency que o usuário deseja comprar/vender */
		target: SC
	}
	/** O preço p[base]/1[target], ou seja, o preço em [base] */
	price: number
	/** A quantidade de [target] que o usuário está comprando/vendendo */
	amount: Decimal128
	/** A quantidade de [base] que o usuário irá pagar/receber com a operação */
	total: Decimal128
	/** A data que essa operação foi adicionada */
	timestamp: Date
}

const OrderSchema = new Schema({
	userId: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	status: {
		type: String,
		enum: [ 'preparing', 'ready' ],
		required: true
	},
	type: {
		type: String,
		enum: ['buy', 'sell'],
		required: true
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
