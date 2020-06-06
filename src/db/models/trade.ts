import mongoose, { Document, Schema } from '../mongoose'
import { ObjectId, Decimal128 } from 'mongodb'
import { detailsOf } from '../../currencyApi'
import type { SuportedCurrencies as SC } from '../../currencyApi'

export interface Trade extends Document {
	/**
	 * Status da operação
	 *
	 * processing: A order está sendo processada pela Market
	 * closed: O processamento da ordem foi concluído
	 */
	status: 'processing'|'closed'
	/** As currencies envolvidas na troca */
	currencies: {
		/** A currency base para cálculo do preço */
		base: SC
		/** A currency que foi comprada/vendida */
		target: SC
	}
	/** Informações específicas do cliente que criou a ordem em modo maker */
	maker: {
		/** ID do usuário que adicionou a ordem maker */
		userId: ObjectId
		/** ID da ordem no orderbook que originou essa trade */
		orderId: ObjectId
		/** O fee que o usuário pagou na operação */
		fee: number
	}
	/** Informações específicas do cliente que criou a ordem em modo taker */
	taker: {
		/** ID do usuário que adicionou a ordem taker */
		userId: ObjectId
		/** ID da ordem no orderbook que originou essa trade */
		orderId: ObjectId
		/** O fee que o usuário pagou na operação */
		fee: number
	}
	/**
	 * A operação que foi realizada usando TARGET como base, ou seja, se essa
	 * operação é de compra ou de venda de target
	 */
	type: 'buy'|'sell' //se target está sendo comprada ou vendida
	/** Quanto de TARGET que foi comprada ou vendida */
	amount: Decimal128
	/** Quanto de target foi pago por cada base (o preço de target em base) */
	price: Decimal128
	/** Quanto de BASE que o usuário pagou/recebeu */
	total: Decimal128
	/** O timestamp dessa operação */
	timestamp: Date
}

const TradeSchema = new Schema({
	status: {
		type: String,
		enum: ['processing', 'closed'],
		required: true
	},
	currencies: {
		base: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true,
			validate: {
				// Garante que base é diferente de target
				validator: function(this: Trade, base: Trade['currencies']['base']) {
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
	maker: {
		userId: {
			type: ObjectId,
			required: true,
			ref: 'Person'
		},
		orderId: {
			type: ObjectId,
			required: true,
			ref: 'Order'
		},
		fee: {
			type: Number,
			required: true,
			min: 0
		}
	},
	taker: {
		userId: {
			type: ObjectId,
			required: true,
			ref: 'Person'
		},
		orderId: {
			type: ObjectId,
			required: true,
			ref: 'Order'
		},
		fee: {
			type: Number,
			required: true,
			min: 0
		}
	},
	type: {
		type: String,
		enum: ['buy', 'sell'],
		required: true
	},
	amount: {
		type: Decimal128,
		required: true,
		validate: {
			validator: v => v > 0,
			message: props => `${props.value} must be a positive number`
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
TradeSchema.pre('validate', function(this: Trade) {
	this.amount = this.amount.truncate(detailsOf(this.currencies.target).decimals)
	this.price = this.price.truncate(detailsOf(this.currencies.base).decimals)
	this.total = this.total.truncate(detailsOf(this.currencies.base).decimals)
})

export default mongoose.model<Trade>('Trade', TradeSchema)
