import { ObjectId } from 'mongodb'
import mongoose, { Document, Schema } from '../mongoose'
import { currencies, currenciesObj } from '../../libs/currencies'
import type { SuportedCurrencies as SC } from '../../libs/currencies'

/** Documento de uma ordem */
export interface OrderDoc extends Document {
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
	/** ID da ordem original, caso essa tenha sido criada após um split */
	originalOrderId?: OrderDoc['_id']
	/** A data que essa operação foi adicionada */
	timestamp: Date
	/** O tipo dessa operação no orderbook */
	readonly type: 'buy'|'sell'
	/** O preço dessa operação no orderbook */
	readonly price: number
	/** Um array com owning e requesting em ordem alfabética de acordo com a currency */
	orderedPair: [OrderDoc['owning'], OrderDoc['requesting']]|[OrderDoc['requesting'], OrderDoc['owning']]
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
			enum: currencies.map(currency => currency.name),
			required: true,
			validate: {
				// Garante que owning é diferente de requesting
				validator: function(this: OrderDoc, owning: OrderDoc['owning']['currency']) {
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
			enum: currencies.map(currency => currency.name),
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
	originalOrderId: {
		type: ObjectId,
		required: false,
		ref: 'orderbook'
	},
	timestamp: {
		type: Date,
		required: true
	}
})

/**
 * Retorna um array com owning e requesting ordenados pelo nome das currencies
 */
OrderSchema.virtual('orderedPair').get(function(this: OrderDoc): OrderDoc['orderedPair'] {
	return [this.owning, this.requesting].sort((a, b) => {
		return a.currency > b.currency ? 1 : a.currency < b.currency ? -1 : 0
	}) as OrderDoc['orderedPair']
})

OrderSchema.virtual('type').get(function(this: OrderDoc): OrderDoc['type'] {
	const [base] = this.orderedPair
	return base.currency == this.owning.currency ? 'buy' : 'sell'
})

OrderSchema.virtual('price').get(function(this: OrderDoc): OrderDoc['price'] {
	const [base, target] = this.orderedPair
	return base.amount / target.amount
})

// Faz a truncagem dos valores de acordo com a currency que eles se referem
OrderSchema.pre('validate', function(this: OrderDoc) {
	this.owning.amount = +this.owning.amount.toFixed(
		currenciesObj[this.owning.currency].decimals
	)
	this.requesting.amount = +this.requesting.amount.toFixed(
		currenciesObj[this.requesting.currency].decimals
	)
})

/**
 * Model do documento de uma ordem
 */
const Order = mongoose.model<OrderDoc>('Order', OrderSchema, 'orderbook')

export default Order
