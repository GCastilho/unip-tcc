import { ObjectId } from 'mongodb'
import mongoose, { Document, Schema } from '../mongoose'
import type { SuportedCurrencies as SC } from '../../currencyApi'

export interface Trade extends Document {
	/**
	 * Status da operação
	 *
	 * processing: A order está sendo processada pela Market
	 * closed: O processamento da ordem foi concluído
	 */
	status: 'processing'|'closed'
	/** Informações da ordem maker */
	maker: {
		/** ID do usuário que adicionou a ordem maker */
		userId: ObjectId
		/** ID da ordem no orderbook que originou essa trade */
		orderId?: ObjectId
		/** A currency que o usuário recebeu na transação */
		currency: SC
		/** A quantidade que o usuário recebeu na transação */
		amount: number
		/** O fee que o usuário pagou na operação */
		fee: number
	}
	/** Informações da ordem taker */
	taker: {
		/** ID do usuário que adicionou a ordem taker */
		userId: ObjectId
		/** ID da ordem no orderbook que originou essa trade */
		orderId?: ObjectId
		/** A currency que o usuário recebeu na transação */
		currency: SC
		/** A quantidade que o usuário recebeu na transação */
		amount: number
		/** O fee que o usuário pagou na operação */
		fee: number
	}
	/** O preço dessa trade no orderbook */
	price: number
	/** O timestamp dessa operação */
	timestamp: Date
	/** Um array com maker e taker em ordem alfabética de acordo com a currency */
	orderedPair: [Trade['maker'], Trade['taker']]|[Trade['taker'], Trade['maker']]
}

const TradeSchema = new Schema({
	status: {
		type: String,
		enum: ['processing', 'closed'],
		required: true
	},
	maker: {
		userId: {
			type: ObjectId,
			required: true,
			ref: 'Person'
		},
		orderId: {
			type: ObjectId,
			required: false,
			ref: 'Order'
		},
		currency: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true,
			validate: {
				// Garante que a currency da maker é diferente da currency da taker
				validator: function(this: Trade, currency: Trade['maker']['currency']) {
					return this.taker.currency != currency
				},
				message: () => 'Currency MAKER must be different than currency TAKER'
			}
		},
		amount: {
			type: Number,
			required: true,
			validate: {
				validator: v => v > 0,
				message: props => `${props.value} must be a positive number`
			}
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
			required: false,
			ref: 'Order'
		},
		currency: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true
		},
		amount: {
			type: Number,
			required: true,
			validate: {
				validator: v => v > 0,
				message: props => `${props.value} must be a positive number`
			}
		},
		fee: {
			type: Number,
			required: true,
			min: 0
		}
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Retorna um array com maker e taker ordenados pelo nome das currencies
 */
TradeSchema.virtual('orderedPair').get(function(this: Trade): Trade['orderedPair'] {
	return [this.maker, this.taker].sort((a, b) => {
		return a.currency > b.currency ? 1 : a.currency < b.currency ? -1 : 0
	}) as Trade['orderedPair']
})

TradeSchema.virtual('price').get(function(this: Trade): Trade['price'] {
	const [base, target] = this.orderedPair
	return base.amount / target.amount
})

export default mongoose.model<Trade>('Trade', TradeSchema)
