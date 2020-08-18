import mongoose, { Document, Schema } from '../mongoose'
import { ObjectId } from 'mongodb'
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
	status: 'preparing'|'ready'|'cancelled'|'matched'
	/** A currency que usuário está em posse para fazer a operação */
	owning: {
		/** O nome da currency que o usuário tem */
		currency: SC
		/** A quantidade da currency que o usuário quer utilizar */
		amount: number
	}
	/** A currency que o usuário quer ter depois da operação */
	requesting: {
		/** O nome da currency que o usuário quer */
		currency: SC
		/** A quantidade mínima que o usuário quer receber */
		amount: number
	}
	/** A data que essa operação foi adicionada */
	timestamp: Date
	/** O tipo dessa operação no orderbook */
	type: 'buy'|'sell'
	/** O preço dessa operação no orderbook */
	price: number
	/** Um array com owning e requesting em ordem alfabética de acordo com a currency */
	orderedPair: [Order['owning'], Order['requesting']]|[Order['requesting'], Order['owning']]
}

const OrderSchema = new Schema({
	userId: {
		type: ObjectId,
		required: true,
		ref: 'Person'
	},
	status: {
		type: String,
		enum: ['preparing', 'ready', 'cancelled', 'matched'],
		required: true
	},
	owning: {
		currency: {
			type: String,
			enum: ['bitcoin', 'nano'],
			required: true,
			validate: {
				// Garante que owning é diferente de requesting
				validator: function(this: Order, owning: Order['owning']['currency']) {
					return this.requesting.currency != owning
				},
				message: () => 'OWNING currency must be different than REQUESTING currency'
			}
		},
		amount: {
			type: Number,
			required: true,
			validate: {
				validator: v => v > 0,
				message: props => `${props.value} must be a positive number`
			}
		}
	},
	requesting: {
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
		}
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Retorna um array com owning e requesting ordenados pelo nome das currencies
 */
OrderSchema.virtual('orderedPair').get(function(this: Order): Order['orderedPair'] {
	return [this.owning, this.requesting].sort((a, b) => {
		return a.currency > b.currency ? 1 : a.currency < b.currency ? -1 : 0
	}) as Order['orderedPair']
})

OrderSchema.virtual('type').get(function(this: Order): Order['type'] {
	const [base] = this.orderedPair
	return base.currency == this.owning.currency ? 'buy' : 'sell'
})

OrderSchema.virtual('price').get(function(this: Order): Order['price'] {
	const [base, target] = this.orderedPair
	return base.amount / target.amount
})

// Faz a truncagem dos valores de acordo com a currency que eles se referem
OrderSchema.pre('validate', function(this: Order) {
	this.owning.amount = +this.owning.amount.toFixed(detailsOf(this.owning.currency).decimals)
	this.requesting.amount = +this.requesting.amount.toFixed(detailsOf(this.requesting.currency).decimals)
})

export default mongoose.model<Order>('Order', OrderSchema, 'orderbook')
