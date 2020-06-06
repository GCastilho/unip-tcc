import mongoose, { Document, Schema } from '../mongoose'
import { ObjectId, Decimal128 } from 'mongodb'
import { detailsOf } from '../../currencyApi'
import type { SuportedCurrencies as SC } from '../../currencyApi'

export interface Order extends Document {
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
	currencies: {
		/** A currency base para cálculo do preço */
		base: SC
		/** A currency que o usuário deseja comprar/vender */
		target: SC
	}
	/** O preço p[base]/1[target], ou seja, o preço em [base] */
	price: Decimal128
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
	currencies: {
		base: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true,
			validate: {
				// Garante que base é diferente de target
				validator: function(this: Order, base: Order['currencies']['base']) {
					return this.currencies.target != base
				},
				message: () => 'Currency BASE must be different than currency TARGET'
			}
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

// Faz a truncagem dos valores de acordo com a currency que eles se referem
OrderSchema.pre('validate', function(this: Order) {
	this.price = this.price.truncate(detailsOf(this.currencies.base).decimals)
	this.total = this.total.truncate(detailsOf(this.currencies.base).decimals)
	this.amount = this.amount.truncate(detailsOf(this.currencies.target).decimals)
})

export default mongoose.model<Order>('Order', OrderSchema, 'orderbook')
